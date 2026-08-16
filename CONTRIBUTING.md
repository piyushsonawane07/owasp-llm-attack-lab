# Contributing

Thanks for your interest in improving the OWASP LLM Attack Lab! This project is meant to stay a small, easy-to-run demo, so contributions that keep it simple are especially welcome.

## Getting set up

Follow the [Quick start](README.md#quick-start) in the README to run the backend and frontend locally.

```bash
# Backend
cd backend && cp .env.example .env && uv sync

# Frontend
cd frontend && cp .env.example .env && npm install
```

## Ways to contribute

- **New OWASP scenarios** — add a poisoned/sensitive sample doc under `sample-docs/` and a matching entry in `frontend/src/constants.js` (`OWASP_TOP_10`), following the existing shape (`shortDesc`, `impact`, `mitigation`, demo prompt, `markers`).
- **Bug fixes** — retrieval, chunking, guardrails, or UI issues.
- **Docs** — clarifying setup steps, environment variables, or the demo flow.

## Guidelines

- Keep everything in `sample-docs/` and demo prompts **fake**: synthetic names, fake API keys, fake credentials. Never commit real secrets, credentials, or personal data (see [SECURITY.md](SECURITY.md)).
- Don't commit `.env` files — only `.env.example` should be tracked.
- Match the existing code style; there's no strict linter config beyond `oxlint` on the frontend (`npm run lint`).
- Prefer small, focused pull requests over large ones.

## Submitting a pull request

1. Fork the repo and create a branch from `main`.
2. Make your change, testing it against a running backend + frontend locally.
3. If you touched `backend/loadtest/`, make sure the Locust/Playwright scripts still run.
4. Open a pull request describing the change and, for new demo scenarios, which OWASP risk it illustrates.

## Reporting issues

Please open a [GitHub issue](../../issues) with steps to reproduce, expected vs. actual behavior, and relevant logs. For security vulnerabilities in the app itself (not the intentionally planted demo content), see [SECURITY.md](SECURITY.md).
