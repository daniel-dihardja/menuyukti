"""Simple section-aware text chunking for knowledge ingest."""

from __future__ import annotations

import re

_HEADING_SPLIT = re.compile(r"(?m)(?=^#{1,3}\s)")


def estimate_token_count(text: str) -> int:
    """Rough token estimate (~4 chars / token) for budgeting, not billing."""
    stripped = text.strip()
    if not stripped:
        return 0
    return max(1, (len(stripped) + 3) // 4)


def split_knowledge_body(
    body: str,
    *,
    max_chars: int = 1200,
    overlap_chars: int = 120,
) -> list[str]:
    """Split markdown-ish body into overlapping chunks.

    Prefers splitting on markdown headings, then packs paragraphs into
    ``max_chars`` windows with ``overlap_chars`` overlap.
    """
    text = body.strip()
    if not text:
        return []

    sections = [s.strip() for s in _HEADING_SPLIT.split(text) if s and s.strip()]
    if not sections:
        sections = [text]

    chunks: list[str] = []
    for section in sections:
        if len(section) <= max_chars:
            chunks.append(section)
            continue
        start = 0
        while start < len(section):
            end = min(len(section), start + max_chars)
            piece = section[start:end].strip()
            if piece:
                chunks.append(piece)
            if end >= len(section):
                break
            start = max(0, end - overlap_chars)
            if start >= end:
                start = end
    return chunks
