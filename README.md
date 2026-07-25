# RAG Demo

A simple Retrieval-Augmented Generation demo for audience try-outs.

Upload `.md`, `.pdf`, `.docx`, or `.txt` documents, ask questions, and inspect retrieved source chunks. Supports **Gemini** and **Ollama** for generation, with a lightweight local embedding model.

## Stack

| Layer | Choice |
| --- | --- |
| Frontend | React + Vite |
| Backend | FastAPI |
| Embeddings | `sentence-transformers/all-MiniLM-L6-v2` |
| Chunking | Fixed-size (~500 chars) with overlap |
| Vector store | In-memory cosine similarity |
| LLMs | Gemini + Ollama |

## Quick start

### 1. Backend

```bash
cd backend
cp .env.example .env
# Add GEMINI_API_KEY if you want Gemini
uv sync
uv run uvicorn app.main:app --host 0.0.0.0 --port 8088 --reload
```

First launch downloads the embedding model (~90MB). API docs: http://localhost:8088/docs

### 2. Frontend

```bash
cd frontend
npm install
npm run dev -- --host
```

Open the printed local URL (default `http://localhost:5173`). The Vite proxy forwards `/api` to port `8088`.

### 3. Optional: Ollama

```bash
ollama pull llama3.2
ollama serve
```

Then pick an Ollama model in the UI.

## Demo flow

1. Upload a document (sample file in `sample-docs/`).
2. Choose Gemini or Ollama.
3. Ask a question.
4. Expand **Sources** under the answer to show retrieval.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Health + index stats |
| `GET` | `/api/models` | Available Gemini / Ollama models |
| `GET` | `/api/documents` | List indexed documents |
| `POST` | `/api/upload` | Upload + chunk + embed |
| `DELETE` | `/api/documents/{id}` | Remove one document |
| `DELETE` | `/api/documents` | Clear knowledge base |
| `POST` | `/api/query` | Retrieve + generate answer |

### Query body

```json
{
  "question": "What are the key risks?",
  "provider": "gemini",
  "model": "gemini-2.0-flash"
}
```

## Exposing to an audience

- Run backend with `--host 0.0.0.0 --port 8088`
- Run frontend with `npm run dev -- --host`
- Share your machine IP / tunnel URL (e.g. ngrok, Cloudflare Tunnel)
- Set `CORS_ORIGINS=*` (default) or your frontend origin in `backend/.env`
- If exposing frontend and backend separately, set `VITE_API_BASE=http://YOUR_HOST:8088`

For a longer session, prefer Gemini (cloud) so guests are not limited by your local GPU/CPU. Keep Ollama as a local fallback.

## Environment

See `backend/.env.example`.

| Variable | Default | Notes |
| --- | --- | --- |
| `GEMINI_API_KEY` | empty | Required for Gemini |
| `GEMINI_MODEL` | `gemini-2.0-flash` | |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | |
| `OLLAMA_MODEL` | `llama3.2` | Fallback label if Ollama is offline |
| `DEFAULT_PROVIDER` | `gemini` | |
| `CHUNK_SIZE` | `500` | Characters |
| `CHUNK_OVERLAP` | `50` | Characters |
| `TOP_K` | `4` | Retrieved chunks |

## Project layout

```
backend/
  app/
    main.py              # FastAPI routes
    config.py
    services/            # parsing, chunking, embeddings, LLM, store
frontend/
  src/
    App.jsx              # Upload + chat UI
sample-docs/             # Ready-to-demo markdown
```

## Notes

- Index is **in-memory** — restarting the backend clears documents.
- Designed for demos, not production multi-tenant use.
- No auth — do not upload sensitive documents on a shared network.
