from typing import Literal

from pydantic import BaseModel, Field


class DocumentInfo(BaseModel):
    id: str
    filename: str
    content_type: str
    size_bytes: int
    chunk_count: int
    uploaded_at: str


class UploadResponse(BaseModel):
    document: DocumentInfo
    message: str


class SourceChunk(BaseModel):
    document_id: str
    filename: str
    chunk_index: int
    text: str
    score: float


class QueryRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
    provider: Literal["gemini", "ollama"] = "gemini"
    model: str | None = None
    top_k: int | None = Field(default=None, ge=1, le=10)


class QueryResponse(BaseModel):
    answer: str
    sources: list[SourceChunk]
    provider: str
    model: str


class LibraryDocInfo(BaseModel):
    filename: str
    size_bytes: int
    extension: str
    indexed: bool
    document_id: str | None = None


class LibraryDocContent(BaseModel):
    filename: str
    extension: str
    content: str


class ModelInfo(BaseModel):
    provider: str
    id: str
    label: str
    available: bool
    note: str | None = None


class ModelsResponse(BaseModel):
    models: list[ModelInfo]
    default_provider: str


class HealthResponse(BaseModel):
    status: str
    documents: int
    chunks: int
    embedding_model: str
