"""Semantic knowledge search with scope / category filters."""

from __future__ import annotations

import math
from collections.abc import Sequence
from dataclasses import dataclass
from typing import Any

from sqlalchemy import Select, and_, or_, select, text
from sqlalchemy.orm import Session, joinedload

from graphql.access import is_location_owner
from graphql.data_sources.models.knowledge import (
    KNOWLEDGE_CATEGORIES,
    KnowledgeChunk,
    KnowledgeDocument,
    KnowledgeEmbedding,
)
from graphql.data_sources.models.location import Location
from graphql.services.knowledge_embeddings import Embedder, default_embedder


@dataclass(frozen=True)
class KnowledgeHit:
    chunk_id: int
    document_id: int
    slug: str
    title: str
    category: str
    scope_type: str
    content: str
    score: float
    metadata: dict[str, Any] | None


def cosine_similarity(a: Sequence[float], b: Sequence[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = 0.0
    na = 0.0
    nb = 0.0
    for x, y in zip(a, b, strict=True):
        fx = float(x)
        fy = float(y)
        dot += fx * fy
        na += fx * fx
        nb += fy * fy
    if na <= 0.0 or nb <= 0.0:
        return 0.0
    return dot / (math.sqrt(na) * math.sqrt(nb))


def _normalize_categories(categories: Sequence[str] | None) -> list[str] | None:
    if not categories:
        return None
    cleaned = [c.strip().lower() for c in categories if isinstance(c, str) and c.strip()]
    cleaned = [c for c in cleaned if c in KNOWLEDGE_CATEGORIES]
    return cleaned or None


def _owned_location_ids(session: Session, user_id: str) -> list[int]:
    """Location ids the user may access (solo owner or workspace member)."""
    from graphql.data_sources.models.workspace import WorkspaceMembership

    solo = list(
        session.scalars(select(Location.id).where(Location.clerk_user_id == user_id)).all()
    )
    workspace_ids = list(
        session.scalars(
            select(WorkspaceMembership.workspace_id).where(
                WorkspaceMembership.clerk_user_id == user_id
            )
        ).all()
    )
    via_ws: list[int] = []
    if workspace_ids:
        via_ws = list(
            session.scalars(
                select(Location.id).where(Location.workspace_id.in_(workspace_ids))
            ).all()
        )
    return sorted({int(x) for x in [*solo, *via_ws]})


def _accessible_scope_clause(
    session: Session,
    user_id: str,
    *,
    location_id: int | None,
) -> Any:
    """SQLAlchemy OR of scopes the caller may read."""
    from graphql.data_sources.models.workspace import WorkspaceMembership

    clauses: list[Any] = [KnowledgeDocument.scope_type == "global"]

    workspace_ids = list(
        session.scalars(
            select(WorkspaceMembership.workspace_id).where(
                WorkspaceMembership.clerk_user_id == user_id
            )
        ).all()
    )
    if workspace_ids:
        clauses.append(
            and_(
                KnowledgeDocument.scope_type == "workspace",
                KnowledgeDocument.workspace_id.in_(workspace_ids),
            )
        )

    owned_ids = _owned_location_ids(session, user_id)
    if location_id is not None:
        owned_ids = [location_id] if location_id in owned_ids else []
    if owned_ids:
        clauses.append(
            and_(
                KnowledgeDocument.scope_type == "location",
                KnowledgeDocument.location_id.in_(owned_ids),
            )
        )
    return or_(*clauses)


def _chart_ids_match(metadata: Any, chart_ids: Sequence[str] | None) -> bool:
    if not chart_ids:
        return True
    if not isinstance(metadata, dict):
        return False
    raw = metadata.get("chart_ids") or []
    if not isinstance(raw, list):
        return False
    have = {str(x) for x in raw}
    return any(cid in have for cid in chart_ids)


def _python_search(
    session: Session,
    *,
    query_vec: list[float],
    user_id: str,
    categories: list[str] | None,
    chart_ids: Sequence[str] | None,
    location_id: int | None,
    limit: int,
) -> list[KnowledgeHit]:
    scope = _accessible_scope_clause(session, user_id, location_id=location_id)
    stmt: Select[tuple[KnowledgeChunk]] = (
        select(KnowledgeChunk)
        .join(KnowledgeDocument, KnowledgeChunk.document_id == KnowledgeDocument.id)
        .join(KnowledgeEmbedding, KnowledgeEmbedding.chunk_id == KnowledgeChunk.id)
        .options(
            joinedload(KnowledgeChunk.document),
            joinedload(KnowledgeChunk.embedding_row),
        )
        .where(
            KnowledgeDocument.status == "published",
            scope,
        )
    )
    if categories:
        stmt = stmt.where(KnowledgeDocument.category.in_(categories))

    rows = list(session.scalars(stmt).unique().all())
    scored: list[KnowledgeHit] = []
    for chunk in rows:
        doc = chunk.document
        meta = chunk.metadata_json if isinstance(chunk.metadata_json, dict) else doc.metadata_json
        if chart_ids and not (
            _chart_ids_match(meta, chart_ids) or _chart_ids_match(doc.metadata_json, chart_ids)
        ):
            continue
        emb_row = chunk.embedding_row
        if emb_row is None or not isinstance(emb_row.embedding, list):
            continue
        score = cosine_similarity(query_vec, emb_row.embedding)
        scored.append(
            KnowledgeHit(
                chunk_id=chunk.id,
                document_id=doc.id,
                slug=doc.slug,
                title=doc.title,
                category=doc.category,
                scope_type=doc.scope_type,
                content=chunk.content,
                score=score,
                metadata=meta if isinstance(meta, dict) else None,
            )
        )
    scored.sort(key=lambda h: h.score, reverse=True)
    return scored[:limit]


def _pgvector_search(
    session: Session,
    *,
    query_vec: list[float],
    user_id: str,
    categories: list[str] | None,
    chart_ids: Sequence[str] | None,
    location_id: int | None,
    limit: int,
) -> list[KnowledgeHit] | None:
    """ANN search via embedding_vec when the column exists; None to fall back."""
    bind = session.get_bind()
    if bind is None or bind.dialect.name != "postgresql":
        return None
    # Detect column
    has_vec = session.execute(
        text(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_name = 'knowledge_embedding' AND column_name = 'embedding_vec' "
            "LIMIT 1"
        )
    ).first()
    if not has_vec:
        return None

    # Use Python path for authz filtering after fetching a wider ANN candidate set —
    # simpler and safer than inlining ownership SQL. Fall back if vec is null-heavy.
    literal = "[" + ",".join(str(float(x)) for x in query_vec) + "]"
    candidate_limit = max(limit * 5, 25)
    try:
        rows = session.execute(
            text(
                "SELECT chunk_id, 1 - (embedding_vec <=> CAST(:q AS vector)) AS score "
                "FROM knowledge_embedding "
                "WHERE embedding_vec IS NOT NULL "
                "ORDER BY embedding_vec <=> CAST(:q AS vector) "
                "LIMIT :lim"
            ),
            {"q": literal, "lim": candidate_limit},
        ).all()
    except Exception:  # noqa: BLE001 — fall back to JSON cosine
        return None

    if not rows:
        return []

    chunk_ids = [int(r[0]) for r in rows]
    score_by_id = {int(r[0]): float(r[1]) for r in rows}
    scope = _accessible_scope_clause(session, user_id, location_id=location_id)
    stmt = (
        select(KnowledgeChunk)
        .join(KnowledgeDocument, KnowledgeChunk.document_id == KnowledgeDocument.id)
        .options(joinedload(KnowledgeChunk.document))
        .where(
            KnowledgeChunk.id.in_(chunk_ids),
            KnowledgeDocument.status == "published",
            scope,
        )
    )
    if categories:
        stmt = stmt.where(KnowledgeDocument.category.in_(categories))
    chunks = list(session.scalars(stmt).unique().all())
    hits: list[KnowledgeHit] = []
    for chunk in chunks:
        doc = chunk.document
        meta = chunk.metadata_json if isinstance(chunk.metadata_json, dict) else doc.metadata_json
        if chart_ids and not (
            _chart_ids_match(meta, chart_ids) or _chart_ids_match(doc.metadata_json, chart_ids)
        ):
            continue
        hits.append(
            KnowledgeHit(
                chunk_id=chunk.id,
                document_id=doc.id,
                slug=doc.slug,
                title=doc.title,
                category=doc.category,
                scope_type=doc.scope_type,
                content=chunk.content,
                score=score_by_id.get(chunk.id, 0.0),
                metadata=meta if isinstance(meta, dict) else None,
            )
        )
    hits.sort(key=lambda h: h.score, reverse=True)
    return hits[:limit]


def search_knowledge(
    session: Session,
    *,
    query: str,
    user_id: str,
    categories: Sequence[str] | None = None,
    chart_ids: Sequence[str] | None = None,
    location_id: int | None = None,
    limit: int = 6,
    embedder: Embedder | None = None,
) -> list[KnowledgeHit]:
    """Return top-k published knowledge chunks the user is allowed to see."""
    q = (query or "").strip()
    if not user_id or not q:
        return []
    lim = max(1, min(int(limit or 6), 20))
    cats = _normalize_categories(categories)
    chart_filter = [c for c in (chart_ids or []) if isinstance(c, str) and c.strip()]

    # Optional: verify location pin is owned (ignore unauthorized pin)
    pinned_location: int | None = None
    if location_id is not None and is_location_owner(session, int(location_id), user_id):
        pinned_location = int(location_id)

    emb = embedder or default_embedder()
    query_vec = emb.embed_texts([q])[0]

    pg_hits = _pgvector_search(
        session,
        query_vec=query_vec,
        user_id=user_id,
        categories=cats,
        chart_ids=chart_filter,
        location_id=pinned_location,
        limit=lim,
    )
    if pg_hits is not None:
        return pg_hits

    return _python_search(
        session,
        query_vec=query_vec,
        user_id=user_id,
        categories=cats,
        chart_ids=chart_filter,
        location_id=pinned_location,
        limit=lim,
    )

