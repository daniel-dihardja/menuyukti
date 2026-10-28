"""Authenticated semantic search over published knowledge chunks."""

from __future__ import annotations

import strawberry

from graphql.context import request_session_scope
from graphql.schema.auth import user_id_from_info
from graphql.schema.types.knowledge import KnowledgeSearchHitType, metadata_to_json_str
from graphql.services.knowledge_search import search_knowledge


@strawberry.type
class KnowledgeSearchQuery:
    @strawberry.field(
        description=(
            "Semantic search over published knowledge (domain, KPI, playbook). "
            "Returns only chunks the caller may access (global + authorized scopes)."
        )
    )
    def search_knowledge(
        self,
        info: strawberry.Info,
        query: str,
        categories: list[str] | None = None,
        chart_ids: list[str] | None = None,
        location_id: int | None = None,
        limit: int | None = 6,
    ) -> list[KnowledgeSearchHitType]:
        user_id = user_id_from_info(info)
        if not user_id:
            return []
        q = (query or "").strip()
        if not q:
            return []

        with request_session_scope(info) as session:
            hits = search_knowledge(
                session,
                query=q,
                user_id=user_id,
                categories=categories,
                chart_ids=chart_ids,
                location_id=location_id,
                limit=limit or 6,
            )
            return [
                KnowledgeSearchHitType(
                    chunk_id=h.chunk_id,
                    document_id=h.document_id,
                    slug=h.slug,
                    title=h.title,
                    category=h.category,
                    scope_type=h.scope_type,
                    content=h.content,
                    score=h.score,
                    metadata_json=metadata_to_json_str(h.metadata),
                )
                for h in hits
            ]
