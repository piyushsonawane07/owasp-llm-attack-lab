# RAG Demo Backend

FastAPI service for document upload, chunking, embedding, retrieval, and LLM generation.

```bash
cp .env.example .env
uv sync
uv run uvicorn app.main:app --host 0.0.0.0 --port 8088 --reload
```

API docs: http://localhost:8088/docs
