# Backend

FastAPI service for the [OWASP LLM Attack Lab](../README.md): document upload, chunking, embedding, retrieval, guardrails, and LLM generation (Ollama or Gemini).

```bash
cp .env.example .env
uv sync
uv run uvicorn app.main:app --host 0.0.0.0 --port 8088 --reload
```

First launch downloads the embedding model (~90MB). API docs: http://localhost:8088/docs

## Structure

```
app/
  main.py        # FastAPI routes
  config.py      # Settings, loaded from .env
  services/      # parsing, chunking, embeddings, LLM, guardrails, vector store
loadtest/        # Locust + Playwright load/regression tests
```

## Load testing

```bash
cd backend
uv run locust -f loadtest/locustfile.py
```

See the [root README](../README.md) for the full quick start, API reference, and environment variables.
