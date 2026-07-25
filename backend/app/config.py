from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "RAG Demo"
    cors_origins: str = "*"

    chunk_size: int = 500
    chunk_overlap: int = 50
    top_k: int = 4
    min_relevance_score: float = 0.15

    sample_docs_dir: str = "../sample-docs"
    auto_ingest_sample_docs: bool = True

    vector_store_dir: str = "data/chroma"
    vector_collection_name: str = "rag_demo_documents"

    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"

    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"

    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "gemma2:2b"

    default_provider: str = "ollama"

    # Optional shared secret required (via X-Admin-Token header) to upload or
    # delete documents. Leave empty during local development; set it before
    # exposing the app to an audience so only "us" can manage the knowledge base.
    admin_token: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
