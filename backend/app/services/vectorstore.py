from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from uuid import uuid4

import chromadb

from app.config import get_settings
from app.models.schemas import DocumentInfo, SourceChunk
from app.services.embeddings import embed_query, embed_texts


class VectorStore:
    """Chroma-backed vector store.

    Chunks are embedded with our own sentence-transformers model (see
    services/embeddings.py) and stored in Chroma with pre-computed vectors,
    so Chroma is used purely as the vector index + persistence layer, and
    document-level metadata (filename, size, upload time, ...) rides along
    as per-chunk metadata. Because Chroma persists to disk, deleting a
    document here genuinely removes its embeddings — not just an in-memory
    slice that would reappear on restart.
    """

    def __init__(self, persist_dir: str, collection_name: str) -> None:
        Path(persist_dir).mkdir(parents=True, exist_ok=True)
        self._client = chromadb.PersistentClient(path=persist_dir)
        self._collection = self._client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},
        )
        self._lock = Lock()

    def add_document(
        self,
        filename: str,
        content_type: str,
        size_bytes: int,
        chunk_texts: list[str],
    ) -> DocumentInfo:
        if not chunk_texts:
            raise ValueError("Document produced no text chunks")

        vectors = embed_texts(chunk_texts)
        doc_id = str(uuid4())
        uploaded_at = datetime.now(timezone.utc).isoformat()

        ids = [f"{doc_id}:{i}" for i in range(len(chunk_texts))]
        metadatas = [
            {
                "document_id": doc_id,
                "filename": filename,
                "chunk_index": i,
                "content_type": content_type,
                "size_bytes": size_bytes,
                "uploaded_at": uploaded_at,
            }
            for i in range(len(chunk_texts))
        ]

        with self._lock:
            self._collection.add(
                ids=ids,
                embeddings=vectors.tolist(),
                documents=chunk_texts,
                metadatas=metadatas,
            )

        return DocumentInfo(
            id=doc_id,
            filename=filename,
            content_type=content_type,
            size_bytes=size_bytes,
            chunk_count=len(chunk_texts),
            uploaded_at=uploaded_at,
        )

    def list_documents(self) -> list[DocumentInfo]:
        with self._lock:
            result = self._collection.get(include=["metadatas"])

        by_doc: dict[str, dict] = {}
        for meta in result.get("metadatas") or []:
            doc_id = meta["document_id"]
            entry = by_doc.setdefault(doc_id, {**meta, "chunk_count": 0})
            entry["chunk_count"] += 1

        docs = [
            DocumentInfo(
                id=doc_id,
                filename=entry["filename"],
                content_type=entry["content_type"],
                size_bytes=entry["size_bytes"],
                chunk_count=entry["chunk_count"],
                uploaded_at=entry["uploaded_at"],
            )
            for doc_id, entry in by_doc.items()
        ]
        docs.sort(key=lambda d: d.uploaded_at, reverse=True)
        return docs

    def delete_document(self, document_id: str) -> bool:
        with self._lock:
            existing = self._collection.get(where={"document_id": document_id}, include=[])
            if not existing.get("ids"):
                return False
            self._collection.delete(where={"document_id": document_id})
            return True

    def clear(self) -> None:
        with self._lock:
            all_ids = self._collection.get(include=[])["ids"]
            if all_ids:
                self._collection.delete(ids=all_ids)

    def search(self, query: str, top_k: int = 4, min_score: float = 0.0) -> list[SourceChunk]:
        with self._lock:
            count = self._collection.count()
            if count == 0:
                return []

            query_vec = embed_query(query)
            k = min(top_k, count)
            result = self._collection.query(
                query_embeddings=[query_vec.tolist()],
                n_results=k,
                include=["documents", "metadatas", "distances"],
            )

        chunks = (result.get("documents") or [[]])[0]
        metas = (result.get("metadatas") or [[]])[0]
        distances = (result.get("distances") or [[]])[0]

        results: list[SourceChunk] = []
        for text, meta, distance in zip(chunks, metas, distances):
            # Cosine space in Chroma: distance = 1 - cosine similarity
            score = 1.0 - float(distance)
            # Drop clearly irrelevant chunks, but always keep the single
            # best match so an answer never loses all of its grounding.
            if score < min_score and results:
                continue

            results.append(
                SourceChunk(
                    document_id=meta["document_id"],
                    filename=meta["filename"],
                    chunk_index=meta["chunk_index"],
                    text=text,
                    score=score,
                )
            )
        return results

    def stats(self) -> tuple[int, int]:
        with self._lock:
            chunk_count = self._collection.count()
            result = self._collection.get(include=["metadatas"])

        doc_count = len({m["document_id"] for m in (result.get("metadatas") or [])})
        return doc_count, chunk_count


_settings = get_settings()
store = VectorStore(_settings.vector_store_dir, _settings.vector_collection_name)
