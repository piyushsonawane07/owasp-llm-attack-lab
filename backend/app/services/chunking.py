def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    """Simple character-based chunking with overlap."""
    cleaned = " ".join(text.split())
    if not cleaned:
        return []

    if len(cleaned) <= chunk_size:
        return [cleaned]

    chunks: list[str] = []
    start = 0
    text_len = len(cleaned)

    while start < text_len:
        end = min(start + chunk_size, text_len)

        # Prefer breaking on sentence / word boundaries when possible
        if end < text_len:
            window = cleaned[start:end]
            for sep in (". ", "? ", "! ", "\n", " "):
                idx = window.rfind(sep)
                if idx > chunk_size // 3:
                    end = start + idx + len(sep)
                    break

        chunk = cleaned[start:end].strip()
        if chunk:
            chunks.append(chunk)

        if end >= text_len:
            break

        start = max(0, end - overlap)
        # Avoid starting the next chunk mid-word
        if start > 0:
            space = cleaned.find(" ", start)
            if space != -1 and space - start < 40:
                start = space + 1

    return chunks
