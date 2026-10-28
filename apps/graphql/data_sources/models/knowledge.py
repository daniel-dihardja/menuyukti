"""Knowledge documents, chunks, and embeddings for advisor RAG (pgvector)."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from graphql.data_sources.database import Base

if TYPE_CHECKING:
    from graphql.data_sources.models.location import Location
    from graphql.data_sources.models.workspace import Workspace

KNOWLEDGE_CATEGORIES = frozenset({"domain", "kpi", "playbook"})
KNOWLEDGE_SCOPE_TYPES = frozenset({"global", "workspace", "location"})
KNOWLEDGE_STATUSES = frozenset({"draft", "published", "archived"})
DEFAULT_EMBEDDING_DIMS = 1536


class KnowledgeDocument(Base):
    """Versioned knowledge source document (global, workspace, or location scoped)."""

    __tablename__ = "knowledge_document"
    __table_args__ = (
        Index("ix_knowledge_document_category", "category"),
        Index("ix_knowledge_document_status", "status"),
        Index("ix_knowledge_document_scope_type", "scope_type"),
        Index("ix_knowledge_document_workspace_id", "workspace_id"),
        Index("ix_knowledge_document_location_id", "location_id"),
        Index("ix_knowledge_document_slug", "slug", unique=True),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(128), nullable=False)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    scope_type: Mapped[str] = mapped_column(String(32), nullable=False, default="global")
    workspace_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("workspace.id", ondelete="CASCADE"),
        nullable=True,
    )
    location_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("location.id", ondelete="CASCADE"),
        nullable=True,
    )
    source_uri: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft")
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    body: Mapped[str] = mapped_column(Text, nullable=False, default="")
    metadata_json: Mapped[dict[str, Any] | list[Any] | None] = mapped_column(
        "metadata",
        JSONB().with_variant(JSON(), "sqlite"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    workspace: Mapped[Workspace | None] = relationship("Workspace")
    location: Mapped[Location | None] = relationship("Location")
    chunks: Mapped[list[KnowledgeChunk]] = relationship(
        "KnowledgeChunk",
        back_populates="document",
        cascade="all, delete-orphan",
        order_by="KnowledgeChunk.chunk_index",
    )


class KnowledgeChunk(Base):
    """Text chunk of a knowledge document used for retrieval."""

    __tablename__ = "knowledge_chunk"
    __table_args__ = (
        UniqueConstraint("document_id", "chunk_index", name="uq_knowledge_chunk_doc_index"),
        Index("ix_knowledge_chunk_document_id", "document_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    document_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("knowledge_document.id", ondelete="CASCADE"),
        nullable=False,
    )
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    token_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    metadata_json: Mapped[dict[str, Any] | list[Any] | None] = mapped_column(
        "metadata",
        JSONB().with_variant(JSON(), "sqlite"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    document: Mapped[KnowledgeDocument] = relationship(
        "KnowledgeDocument",
        back_populates="chunks",
    )
    embedding_row: Mapped[KnowledgeEmbedding | None] = relationship(
        "KnowledgeEmbedding",
        back_populates="chunk",
        uselist=False,
        cascade="all, delete-orphan",
    )


class KnowledgeEmbedding(Base):
    """Embedding vector for a knowledge chunk.

    ``embedding`` is stored as JSON (list[float]) for SQLite tests and portable ORM access.
    On Postgres, ``embedding_vec`` (pgvector) is maintained for ANN search.
    """

    __tablename__ = "knowledge_embedding"

    chunk_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("knowledge_chunk.id", ondelete="CASCADE"),
        primary_key=True,
    )
    embedding: Mapped[list[Any]] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"),
        nullable=False,
    )
    embedding_model: Mapped[str] = mapped_column(String(128), nullable=False)
    embedded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    chunk: Mapped[KnowledgeChunk] = relationship(
        "KnowledgeChunk",
        back_populates="embedding_row",
    )
