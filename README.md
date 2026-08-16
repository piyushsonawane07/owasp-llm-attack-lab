# OWASP LLM Attack Lab

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

A hands-on, runnable **Retrieval-Augmented Generation (RAG)** app that doubles as a live demo of the **[OWASP Top 10 for LLM Applications](https://genai.owasp.org/llm-top-10/)**.

There's no simulator and no canned "attack" responses. Poisoned/sensitive content is planted directly in `sample-docs/`, and every demo prompt is a real question sent through the real pipeline (FastAPI + Ollama/Gemini). Whatever the model actually retrieves and generates is what gets shown — the UI simply flags, after the fact, whether the response leaked or repeated the planted vulnerability.

Upload your own `.md`, `.pdf`, `.docx`, or `.txt` documents, ask questions, inspect retrieved source chunks, and walk through each OWASP risk with a live, reproducible example.


<img width="1725" height="896" alt="Screenshot 2026-08-16 at 9 55 55 AM" src="https://github.com/user-attachments/assets/6647084c-6320-4f0a-b80f-61f405f258d3" />


## Stack

| Layer | Choice |
| --- | --- |
| Frontend | React + Vite |
| Backend | FastAPI |
| Embeddings | `sentence-transformers/all-MiniLM-L6-v2` |
| Chunking | Fixed-size (~500 chars) with overlap |
| Vector store | In-memory cosine similarity (Chroma) |
| LLMs | Ollama (local, default) + Gemini (cloud, optional) |
| Guardrails | NeMo Guardrails |

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
cp .env.example .env
npm install
npm run dev -- --host
```

Open the printed local URL (default `http://localhost:5173`). The Vite proxy forwards `/api` to port `8088`.

### 3. Optional: Ollama

```bash
ollama pull gemma2:2b
ollama serve
```

Then pick an Ollama model in the UI.

## Demo flow

1. Upload a document (sample files with planted vulnerabilities live in `sample-docs/`).
2. Choose Ollama or Gemini.
3. Ask a question, or walk through the curated OWASP Top 10 prompts in the UI.
4. Expand **Sources** under the answer to inspect retrieval.
5. Watch the attack-resistance indicator flag whether the model leaked/repeated the planted vulnerability.

## OWASP Top 10 for LLM Applications

Each entry in the UI maps a real OWASP LLM risk to poisoned content already indexed in `sample-docs/`:

| ID | Risk |
| --- | --- |
| LLM01 | Prompt Injection |
| LLM02 | Sensitive Information Disclosure |
| LLM03 | Supply Chain |
| LLM04 | Data and Model Poisoning |
| LLM05 | Improper Output Handling |
| LLM06 | Excessive Agency |
| LLM07 | System Prompt Leakage |
| LLM08 | Vector and Embedding Weaknesses |
| LLM09 | Misinformation |
| LLM10 | Unbounded Consumption |

See `frontend/src/constants.js` for the full prompts, expected impact, and mitigations shown for each risk.

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
| `POST` | `/api/agent-query` | Excessive Agency (LLM06) demo endpoint |

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
- Set `ADMIN_TOKEN` in `backend/.env` before exposing the app so only you can upload or delete documents (sent as the `X-Admin-Token` header)
- Set `CORS_ORIGINS=*` (default) or your frontend origin in `backend/.env`
- If exposing frontend and backend separately, set `VITE_API_BASE=http://YOUR_HOST:8088`

For a longer session, prefer Gemini (cloud) so guests are not limited by your local GPU/CPU. Keep Ollama as a local fallback.

## Environment

See `backend/.env.example` and `frontend/.env.example`.

| Variable | Default | Notes |
| --- | --- | --- |
| `GEMINI_API_KEY` | empty | Required for Gemini |
| `GEMINI_MODEL` | `gemini-2.0-flash` | |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | |
| `OLLAMA_MODEL` | `gemma2:2b` | |
| `DEFAULT_PROVIDER` | `ollama` | |
| `ADMIN_TOKEN` | empty | Required for upload/delete once you expose the app publicly |
| `CORS_ORIGINS` | `*` | |
| `CHUNK_SIZE` | `500` | Characters |
| `CHUNK_OVERLAP` | `50` | Characters |
| `TOP_K` | `4` | Retrieved chunks |
| `EMBEDDING_MODEL` | `sentence-transformers/all-MiniLM-L6-v2` | |

## Project layout

```
backend/
  app/
    main.py              # FastAPI routes
    config.py
    services/            # parsing, chunking, embeddings, LLM, guardrails, store
  loadtest/              # Locust + Playwright load/regression tests
frontend/
  src/
    App.jsx              # Upload + chat UI
    components/          # ChatView, OwaspView, etc.
    constants.js          # OWASP Top 10 prompts, impacts, mitigations
sample-docs/             # Ready-to-demo markdown with planted vulnerabilities
```

## Security note

This project intentionally plants **fake** vulnerabilities (dummy credentials, fake API keys, synthetic PII) in `sample-docs/` and `frontend/src/constants.js` to demonstrate LLM risks. These values are not real and are safe to publish. Do not add real secrets, credentials, or personal data to this repository — see [SECURITY.md](SECURITY.md) for how to report an actual vulnerability.

## Notes

- Index is **in-memory** — restarting the backend clears documents.
- Designed for demos and security education, not production multi-tenant use.
- No auth by default — set `ADMIN_TOKEN` before exposing the app on a shared network, and don't upload real sensitive documents.

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for setup notes, coding conventions, and how to propose new OWASP demo scenarios.

## License

Licensed under the [MIT License](LICENSE).
