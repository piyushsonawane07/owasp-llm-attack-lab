# Frontend

React + Vite UI for the [OWASP LLM Attack Lab](../README.md): document upload, chat, and the OWASP Top 10 for LLM Applications walkthrough.

```bash
cp .env.example .env
npm install
npm run dev -- --host
```

Open the printed local URL (default `http://localhost:5173`). The Vite dev server proxies `/api` to the backend on port `8088` (see `vite.config.js`).

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run `oxlint` |

## Structure

```
src/
  App.jsx              # Upload + chat UI, top-level state
  components/           # ChatView, OwaspView, and other UI pieces
  constants.js          # OWASP Top 10 prompts, impacts, and mitigations
```

See the [root README](../README.md) for the full quick start, API reference, and environment variables.
