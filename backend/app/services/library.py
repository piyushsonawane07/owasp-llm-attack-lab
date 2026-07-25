from __future__ import annotations

from pathlib import Path

from app.config import get_settings
from app.services.parsers import extract_text, is_supported


def library_root() -> Path:
    settings = get_settings()
    root = (Path(__file__).resolve().parent.parent.parent / settings.sample_docs_dir).resolve()
    root.mkdir(parents=True, exist_ok=True)
    return root


def list_library_files() -> list[Path]:
    root = library_root()
    if not root.exists():
        return []
    return sorted(
        (p for p in root.iterdir() if p.is_file() and is_supported(p.name)),
        key=lambda p: p.name.lower(),
    )


def resolve_library_file(filename: str) -> Path:
    root = library_root()
    candidate = (root / filename).resolve()

    # Guard against path traversal outside the sample-docs directory
    if root not in candidate.parents and candidate != root:
        raise FileNotFoundError(filename)
    if not candidate.is_file() or not is_supported(candidate.name):
        raise FileNotFoundError(filename)

    return candidate


def read_library_file_text(filename: str) -> str:
    path = resolve_library_file(filename)
    return extract_text(path)
