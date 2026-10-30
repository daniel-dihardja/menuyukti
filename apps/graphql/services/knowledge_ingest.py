"""Ingest / upsert knowledge documents, chunks, and embeddings."""

from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from sqlalchemy import delete, select, text
from sqlalchemy.orm import Session

from graphql.data_sources.models.knowledge import (
    KNOWLEDGE_CATEGORIES,
    KNOWLEDGE_SCOPE_TYPES,
    KnowledgeChunk,
    KnowledgeDocument,
    KnowledgeEmbedding,
)
from graphql.services.knowledge_chunking import estimate_token_count, split_knowledge_body
from graphql.services.knowledge_embeddings import (
    Embedder,
    default_embedder,
    resolve_embedding_model,
)

_FRONT_MATTER = re.compile(r"(?s)\A---\s*\n(.*?)\n---\s*\n(.*)\Z")
_SLUG_SAFE = re.compile(r"[^a-z0-9]+")


@dataclass(frozen=True)
class KnowledgeSeedSpec:
    slug: str
    title: str
    category: str
    body: str
    scope_type: str = "global"
    workspace_id: int | None = None
    location_id: int | None = None
    source_uri: str | None = None
    metadata: dict[str, Any] | None = None
    status: str = "published"


@dataclass(frozen=True)
class IngestResult:
    document_id: int
    slug: str
    version: int
    chunk_count: int
    skipped: bool


@dataclass(frozen=True)
class ClearKnowledgeResult:
    documents: int
    chunks: int
    embeddings: int


def content_hash(body: str, *, title: str, category: str, metadata: dict[str, Any] | None) -> str:
    payload = {
        "title": title,
        "category": category,
        "body": body,
        "metadata": metadata or {},
    }
    raw = json.dumps(payload, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def slugify(value: str) -> str:
    s = _SLUG_SAFE.sub("-", value.strip().lower()).strip("-")
    return s[:120] or "doc"


def parse_seed_markdown(path: Path) -> KnowledgeSeedSpec:
    """Parse a seed markdown file with optional YAML-like front matter (key: value)."""
    text_body = path.read_text(encoding="utf-8")
    meta: dict[str, Any] = {}
    body = text_body
    match = _FRONT_MATTER.match(text_body)
    if match:
        fm, body = match.group(1), match.group(2)
        for line in fm.splitlines():
            line = line.strip()
            if not line or line.startswith("#") or ":" not in line:
                continue
            key, _, val = line.partition(":")
            key = key.strip()
            val = val.strip().strip('"').strip("'")
            if key == "chart_ids":
                meta[key] = [p.strip() for p in val.split(",") if p.strip()]
            elif key in {"workspace_id", "location_id"}:
                meta[key] = int(val) if val else None
            else:
                meta[key] = val

    category = str(meta.get("category", "domain")).strip().lower()
    if category not in KNOWLEDGE_CATEGORIES:
        raise ValueError(f"{path}: invalid category {category!r}")
    scope_type = str(meta.get("scope_type", "global")).strip().lower()
    if scope_type not in KNOWLEDGE_SCOPE_TYPES:
        raise ValueError(f"{path}: invalid scope_type {scope_type!r}")
    if scope_type != "global":
        raise ValueError(f"{path}: MVP ingest only allows scope_type=global")

    title = str(meta.get("title") or path.stem.replace("-", " ").title())
    slug = str(meta.get("slug") or slugify(path.stem))
    status = str(meta.get("status", "published")).strip().lower()
    chart_ids = meta.get("chart_ids")
    doc_meta: dict[str, Any] = {}
    if isinstance(chart_ids, list) and chart_ids:
        doc_meta["chart_ids"] = chart_ids

    return KnowledgeSeedSpec(
        slug=slug,
        title=title,
        category=category,
        body=body.strip() + "\n",
        scope_type=scope_type,
        workspace_id=None,
        location_id=None,
        source_uri=str(path),
        metadata=doc_meta or None,
        status=status if status in {"draft", "published", "archived"} else "published",
    )


def _sync_pgvector(session: Session, chunk_id: int, vector: list[float]) -> None:
    """Best-effort sync of embedding_vec for Postgres ANN indexes."""
    bind = session.get_bind()
    if bind is None or bind.dialect.name != "postgresql":
        return
    literal = "[" + ",".join(str(float(x)) for x in vector) + "]"
    session.execute(
        text(
            "UPDATE knowledge_embedding "
            "SET embedding_vec = CAST(:vec AS vector) "
            "WHERE chunk_id = :chunk_id"
        ),
        {"vec": literal, "chunk_id": chunk_id},
    )


def upsert_knowledge_document(
    session: Session,
    spec: KnowledgeSeedSpec,
    *,
    embedder: Embedder | None = None,
    force: bool = False,
) -> IngestResult:
    """Create or update a knowledge document and (re)embed its chunks."""
    if spec.category not in KNOWLEDGE_CATEGORIES:
        raise ValueError(f"invalid category: {spec.category}")
    if spec.scope_type not in KNOWLEDGE_SCOPE_TYPES:
        raise ValueError(f"invalid scope_type: {spec.scope_type}")
    if spec.scope_type == "global" and (spec.workspace_id or spec.location_id):
        raise ValueError("global scope must not set workspace_id/location_id")
    if spec.scope_type == "workspace" and not spec.workspace_id:
        raise ValueError("workspace scope requires workspace_id")
    if spec.scope_type == "location" and not spec.location_id:
        raise ValueError("location scope requires location_id")

    digest = content_hash(
        spec.body, title=spec.title, category=spec.category, metadata=spec.metadata
    )
    existing = session.scalar(
        select(KnowledgeDocument).where(KnowledgeDocument.slug == spec.slug)
    )
    now = datetime.now(UTC)
    if existing is not None and existing.content_hash == digest and not force:
        return IngestResult(
            document_id=existing.id,
            slug=existing.slug,
            version=existing.version,
            chunk_count=len(existing.chunks),
            skipped=True,
        )

    embedder = embedder or default_embedder()
    model_name = resolve_embedding_model()
    pieces = split_knowledge_body(spec.body)
    if not pieces:
        raise ValueError(f"document {spec.slug!r} has empty body after chunking")

    if existing is None:
        doc = KnowledgeDocument(
            slug=spec.slug,
            title=spec.title,
            category=spec.category,
            scope_type=spec.scope_type,
            workspace_id=spec.workspace_id,
            location_id=spec.location_id,
            source_uri=spec.source_uri,
            status=spec.status,
            version=1,
            content_hash=digest,
            body=spec.body,
            metadata_json=spec.metadata,
            published_at=now if spec.status == "published" else None,
        )
        session.add(doc)
        session.flush()
    else:
        doc = existing
        doc.title = spec.title
        doc.category = spec.category
        doc.scope_type = spec.scope_type
        doc.workspace_id = spec.workspace_id
        doc.location_id = spec.location_id
        doc.source_uri = spec.source_uri
        doc.status = spec.status
        doc.version = int(doc.version or 1) + 1
        doc.content_hash = digest
        doc.body = spec.body
        doc.metadata_json = spec.metadata
        doc.updated_at = now
        if spec.status == "published" and doc.published_at is None:
            doc.published_at = now
        # Replace chunks + embeddings
        old_ids = [c.id for c in list(doc.chunks)]
        if old_ids:
            session.execute(
                delete(KnowledgeEmbedding).where(KnowledgeEmbedding.chunk_id.in_(old_ids))
            )
            session.execute(delete(KnowledgeChunk).where(KnowledgeChunk.id.in_(old_ids)))
            session.flush()

    vectors = embedder.embed_texts(pieces)
    for idx, (content, vector) in enumerate(zip(pieces, vectors, strict=True)):
        chunk = KnowledgeChunk(
            document_id=doc.id,
            chunk_index=idx,
            content=content,
            token_count=estimate_token_count(content),
            metadata_json={"chart_ids": (spec.metadata or {}).get("chart_ids")}
            if spec.metadata and spec.metadata.get("chart_ids")
            else None,
        )
        session.add(chunk)
        session.flush()
        emb = KnowledgeEmbedding(
            chunk_id=chunk.id,
            embedding=vector,
            embedding_model=model_name,
            embedded_at=now,
        )
        session.add(emb)
        session.flush()
        _sync_pgvector(session, chunk.id, vector)

    session.flush()
    return IngestResult(
        document_id=doc.id,
        slug=doc.slug,
        version=doc.version,
        chunk_count=len(pieces),
        skipped=False,
    )


def ingest_seed_directory(
    session: Session,
    directory: Path,
    *,
    embedder: Embedder | None = None,
    force: bool = False,
) -> list[IngestResult]:
    """Ingest all ``*.md`` files under ``directory`` (non-recursive)."""
    if not directory.is_dir():
        raise FileNotFoundError(f"seed directory not found: {directory}")
    results: list[IngestResult] = []
    for path in sorted(directory.glob("*.md")):
        spec = parse_seed_markdown(path)
        results.append(
            upsert_knowledge_document(session, spec, embedder=embedder, force=force)
        )
    return results


def clear_knowledge_corpus(session: Session) -> ClearKnowledgeResult:
    """Delete all knowledge embeddings, chunks, and documents.

    Child tables first so SQLite (no FK enforce) and Postgres stay consistent.
    Ingest does not prune removed seed files — use this for a full wipe, then
    ``ingest_seed_directory`` to rebuild from ``knowledge/*.md``.
    """
    embeddings = session.execute(delete(KnowledgeEmbedding)).rowcount or 0
    chunks = session.execute(delete(KnowledgeChunk)).rowcount or 0
    documents = session.execute(delete(KnowledgeDocument)).rowcount or 0
    session.flush()
    return ClearKnowledgeResult(
        documents=int(documents),
        chunks=int(chunks),
        embeddings=int(embeddings),
    )
