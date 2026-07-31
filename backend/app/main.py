from __future__ import annotations

import shutil
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.models.schemas import (
    DocumentInfo,
    HealthResponse,
    LibraryDocContent,
    LibraryDocInfo,
    ModelsResponse,
    QueryRequest,
    QueryResponse,
    UploadResponse,
)
from app.services.chunking import chunk_text
from app.services.embeddings import get_embedding_model
from app.services.library import (
    library_root,
    list_library_files,
    read_library_file_text,
    resolve_library_file,
)
from app.services.guardrails import GuardrailBlocked, check_input, check_output
from app.services.llm import generate_answer, list_available_models
from app.services.parsers import extract_text, is_supported
from app.services.vectorstore import store


def _ingest_library_file(path: Path) -> None:
    settings = get_settings()
    text = extract_text(path)
    chunks = chunk_text(text, settings.chunk_size, settings.chunk_overlap)
    if not chunks:
        raise ValueError("No extractable text found in document")
    store.add_document(
        filename=path.name,
        content_type="text/plain",
        size_bytes=path.stat().st_size,
        chunk_texts=chunks,
    )


def _ingest_sample_docs() -> None:
    """Pre-load the sample-docs library so the audience has content to query
    without needing upload access themselves."""
    settings = get_settings()
    if not settings.auto_ingest_sample_docs:
        return

    already_indexed = {doc.filename for doc in store.list_documents()}

    for path in list_library_files():
        if path.name in already_indexed:
            continue
        try:
            _ingest_library_file(path)
        except Exception:
            # Skip files that fail to parse rather than blocking startup
            continue


def _reindex_library(force: bool) -> dict[str, list[str] | int]:
    """Re-scan sample-docs/ and index anything new. With force=True, files
    already indexed are removed and re-ingested too (picks up edits)."""
    indexed_ids = {doc.filename: doc.id for doc in store.list_documents()}
    added: list[str] = []
    updated: list[str] = []
    skipped: list[str] = []
    failed: list[str] = []

    for path in list_library_files():
        is_indexed = path.name in indexed_ids
        if is_indexed and not force:
            skipped.append(path.name)
            continue

        try:
            if is_indexed:
                store.delete_document(indexed_ids[path.name])
            _ingest_library_file(path)
            (updated if is_indexed else added).append(path.name)
        except Exception:
            failed.append(path.name)

    docs, chunks = store.stats()
    return {
        "added": added,
        "updated": updated,
        "skipped": skipped,
        "failed": failed,
        "documents": docs,
        "chunks": chunks,
    }


def require_admin(x_admin_token: str | None = Header(default=None)) -> None:
    settings = get_settings()
    if not settings.admin_token:
        return
    if x_admin_token != settings.admin_token:
        raise HTTPException(status_code=403, detail="Admin token required for this action")


@asynccontextmanager
async def lifespan(_: FastAPI):
    library_root().mkdir(parents=True, exist_ok=True)
    # Warm embedding model at startup so first query is snappy for demos
    get_embedding_model()
    _ingest_sample_docs()
    yield


settings = get_settings()
app = FastAPI(title=settings.app_name, lifespan=lifespan)

origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
allow_all = origins == ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allow_all else origins,
    allow_credentials=not allow_all,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    docs, chunks = store.stats()
    return HealthResponse(
        status="ok",
        documents=docs,
        chunks=chunks,
        embedding_model=settings.embedding_model,
    )


@app.get("/api/models", response_model=ModelsResponse)
async def models() -> ModelsResponse:
    return ModelsResponse(models=await list_available_models(), default_provider=settings.default_provider)


@app.get("/api/documents", response_model=list[DocumentInfo])
def list_documents() -> list[DocumentInfo]:
    return store.list_documents()


@app.get("/api/library", response_model=list[LibraryDocInfo])
def list_library() -> list[LibraryDocInfo]:
    indexed_ids = {doc.filename: doc.id for doc in store.list_documents()}
    docs: list[LibraryDocInfo] = []
    for path in list_library_files():
        docs.append(
            LibraryDocInfo(
                filename=path.name,
                size_bytes=path.stat().st_size,
                extension=path.suffix.lower(),
                indexed=path.name in indexed_ids,
                document_id=indexed_ids.get(path.name),
            )
        )
    return docs


@app.get("/api/library/{filename}", response_model=LibraryDocContent)
def get_library_file(filename: str) -> LibraryDocContent:
    try:
        content = read_library_file_text(filename)
        path = resolve_library_file(filename)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Document not found") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to read document: {exc}") from exc

    return LibraryDocContent(filename=path.name, extension=path.suffix.lower(), content=content)


@app.post("/api/library/reindex", dependencies=[Depends(require_admin)])
def reindex_library(force: bool = False) -> dict[str, list[str] | int]:
    """Pick up new (or, with ?force=true, edited) files placed in sample-docs/
    without restarting the server."""
    return _reindex_library(force=force)


@app.post("/api/upload", response_model=UploadResponse, dependencies=[Depends(require_admin)])
async def upload(file: UploadFile = File(...)) -> UploadResponse:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")

    filename = Path(file.filename).name  # strip any path components
    if not is_supported(filename):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Use .md, .pdf, .docx, .txt, or .text",
        )

    # Uploaded files land directly in sample-docs/ so they show up in the
    # Document Library and survive alongside the rest of the demo content.
    dest = library_root() / filename
    is_replace = filename in {doc.filename for doc in store.list_documents()}

    try:
        with dest.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        text = extract_text(dest)
        chunks = chunk_text(text, settings.chunk_size, settings.chunk_overlap)
        if not chunks:
            dest.unlink(missing_ok=True)
            raise HTTPException(status_code=400, detail="No extractable text found in document")

        if is_replace:
            existing = next(
                (doc for doc in store.list_documents() if doc.filename == filename), None
            )
            if existing:
                store.delete_document(existing.id)

        document = store.add_document(
            filename=filename,
            content_type=file.content_type or "application/octet-stream",
            size_bytes=dest.stat().st_size,
            chunk_texts=chunks,
        )
    except HTTPException:
        raise
    except Exception as exc:
        dest.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"Failed to process document: {exc}") from exc
    finally:
        await file.close()

    message = "Document replaced and re-indexed" if is_replace else "Document uploaded and indexed"
    return UploadResponse(document=document, message=message)


@app.delete("/api/documents/{document_id}", dependencies=[Depends(require_admin)])
def delete_document(document_id: str, delete_file: bool = False) -> dict[str, str]:
    target = next((doc for doc in store.list_documents() if doc.id == document_id), None)
    if target is None:
        raise HTTPException(status_code=404, detail="Document not found")

    # Removes the document's chunks and embeddings from the (persisted)
    # Chroma vector store — not just an in-memory reference.
    store.delete_document(document_id)

    if delete_file:
        try:
            resolve_library_file(target.filename).unlink(missing_ok=True)
        except FileNotFoundError:
            pass

    message = "Document and embeddings deleted"
    if delete_file:
        message += " (file removed from sample-docs/)"
    return {"message": message}


@app.delete("/api/documents", dependencies=[Depends(require_admin)])
def clear_documents() -> dict[str, str]:
    # Clears all embeddings from the vector store. Files on disk in
    # sample-docs/ are left untouched so a reindex can bring them back.
    store.clear()
    return {"message": "All embeddings cleared from the vector store (files kept in sample-docs/)"}


@app.post("/api/query", response_model=QueryResponse)
async def query(body: QueryRequest) -> QueryResponse:
    docs, _ = store.stats()
    if docs == 0:
        raise HTTPException(
            status_code=400,
            detail="No documents uploaded yet. Upload a document before querying.",
        )

    if body.guardrails_enabled:
        try:
            await check_input(body.question)
        except GuardrailBlocked as exc:
            return QueryResponse(
                answer=exc.message,
                sources=[],
                provider=body.provider,
                model=body.model or "",
                guardrail_blocked="input",
            )

    top_k = body.top_k or settings.top_k
    sources = store.search(
        body.question,
        top_k=top_k,
        min_score=settings.min_relevance_score,
    )

    try:
        answer, model_name = await generate_answer(
            question=body.question,
            sources=sources,
            provider=body.provider,
            model=body.model,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Generation failed: {exc}") from exc

    if body.guardrails_enabled:
        block_message = await check_output(body.question, answer)
        if block_message:
            return QueryResponse(
                answer=block_message,
                sources=sources,
                provider=body.provider,
                model=model_name,
                guardrail_blocked="output",
            )

    return QueryResponse(
        answer=answer,
        sources=sources,
        provider=body.provider,
        model=model_name,
    )


def main() -> None:
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8088, reload=True)


if __name__ == "__main__":
    main()
