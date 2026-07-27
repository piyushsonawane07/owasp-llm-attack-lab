from __future__ import annotations

import httpx
from google import genai

from app.config import get_settings
from app.models.schemas import ModelInfo, SourceChunk


SYSTEM_PROMPT = """You are a helpful RAG demo assistant.
Answer the user's question using ONLY the provided context from uploaded documents.
If the context is insufficient, say you do not have enough information in the uploaded documents.
Be concise and clear. Cite filenames when useful."""


def build_prompt(question: str, sources: list[SourceChunk]) -> str:
    if not sources:
        context = "No relevant documents were found."
    else:
        parts = []
        for i, src in enumerate(sources, start=1):
            parts.append(f"[Source {i}: {src.filename}]\n{src.text}")
        context = "\n\n".join(parts)

    return (
        f"{SYSTEM_PROMPT}\n\n"
        f"Context:\n{context}\n\n"
        f"Question: {question}\n\n"
        f"Answer:"
    )


async def generate_answer(
    question: str,
    sources: list[SourceChunk],
    provider: str,
    model: str | None = None,
) -> tuple[str, str]:
    settings = get_settings()
    prompt = build_prompt(question, sources)

    if provider == "gemini":
        model_name = model or settings.gemini_model
        answer = await _generate_gemini(prompt, model_name)
        return answer, model_name

    if provider == "ollama":
        model_name = model or settings.ollama_model
        answer = await _generate_ollama(prompt, model_name)
        return answer, model_name

    raise ValueError(f"Unsupported provider: {provider}")


async def _generate_gemini(prompt: str, model: str) -> str:
    import asyncio

    settings = get_settings()
    if not settings.gemini_api_key:
        raise RuntimeError(
            "GEMINI_API_KEY is not set. Add it to backend/.env or switch to Ollama."
        )

    def _call() -> str:
        from google.genai import types

        client = genai.Client(api_key=settings.gemini_api_key)
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(temperature=settings.temperature),
        )
        text = getattr(response, "text", None)
        if not text:
            raise RuntimeError("Gemini returned an empty response.")
        return text.strip()

    return await asyncio.to_thread(_call)


async def _generate_ollama(prompt: str, model: str) -> str:
    settings = get_settings()
    url = f"{settings.ollama_base_url.rstrip('/')}/api/generate"

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                url,
                json={
                    "model": model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": settings.temperature},
                },
            )
            response.raise_for_status()
            data = response.json()
            answer = data.get("response", "").strip()
            if not answer:
                raise RuntimeError("Ollama returned an empty response.")
            return answer
    except httpx.ConnectError as exc:
        raise RuntimeError(
            f"Could not connect to Ollama at {settings.ollama_base_url}. Is Ollama running?"
        ) from exc
    except httpx.HTTPStatusError as exc:
        detail = exc.response.text
        raise RuntimeError(f"Ollama error: {detail}") from exc


async def list_available_models() -> list[ModelInfo]:
    """Only a single, fixed model is exposed for this demo: the configured
    Ollama model. This keeps the audience-facing picker simple."""
    settings = get_settings()

    ollama_models = await _fetch_ollama_models()
    available = settings.ollama_model in ollama_models if ollama_models else False

    return [
        ModelInfo(
            provider="ollama",
            id=settings.ollama_model,
            label=f"Ollama ({settings.ollama_model})",
            available=available,
            note=None
            if available
            else f"Run `ollama pull {settings.ollama_model}` and start Ollama at {settings.ollama_base_url}",
        )
    ]


async def _fetch_ollama_models() -> list[str]:
    settings = get_settings()
    url = f"{settings.ollama_base_url.rstrip('/')}/api/tags"
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
            return [m.get("name") for m in data.get("models", []) if m.get("name")]
    except Exception:
        return []
