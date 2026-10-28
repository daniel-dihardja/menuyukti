"""GraphQL types for knowledge search results."""

from __future__ import annotations

import json
from typing import Any

import strawberry


@strawberry.type(description="A retrieved knowledge chunk for advisor RAG.")
class KnowledgeSearchHitType:
    chunk_id: int
    document_id: int
    slug: str
    title: str
    category: str
    scope_type: str
    content: str
    score: float
    metadata_json: str | None = strawberry.field(
        name="metadata",
        description="Optional JSON metadata (e.g. chart_ids) as a string.",
    )


def metadata_to_json_str(meta: dict[str, Any] | None) -> str | None:
    if not meta:
        return None
    return json.dumps(meta, ensure_ascii=False)
