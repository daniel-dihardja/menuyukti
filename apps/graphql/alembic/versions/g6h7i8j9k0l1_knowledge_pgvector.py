"""knowledge documents, chunks, embeddings + pgvector

Revision ID: g6h7i8j9k0l1
Revises: f5a6b7c8d9e0
Create Date: 2026-10-28

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "g6h7i8j9k0l1"
down_revision: str | Sequence[str] | None = "f5a6b7c8d9e0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_EMBEDDING_DIMS = 1536


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "knowledge_document",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("slug", sa.String(length=128), nullable=False),
        sa.Column("title", sa.String(length=512), nullable=False),
        sa.Column("category", sa.String(length=64), nullable=False),
        sa.Column("scope_type", sa.String(length=32), nullable=False),
        sa.Column("workspace_id", sa.Integer(), nullable=True),
        sa.Column("location_id", sa.Integer(), nullable=True),
        sa.Column("source_uri", sa.String(length=1024), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("content_hash", sa.String(length=64), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column(
            "metadata",
            postgresql.JSONB(astext_type=sa.Text()).with_variant(sa.JSON(), "sqlite"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["location_id"], ["location.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspace.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index("ix_knowledge_document_category", "knowledge_document", ["category"])
    op.create_index("ix_knowledge_document_status", "knowledge_document", ["status"])
    op.create_index("ix_knowledge_document_scope_type", "knowledge_document", ["scope_type"])
    op.create_index(
        "ix_knowledge_document_workspace_id", "knowledge_document", ["workspace_id"]
    )
    op.create_index(
        "ix_knowledge_document_location_id", "knowledge_document", ["location_id"]
    )
    op.create_index("ix_knowledge_document_slug", "knowledge_document", ["slug"], unique=True)

    op.create_table(
        "knowledge_chunk",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("document_id", sa.Integer(), nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("token_count", sa.Integer(), nullable=False),
        sa.Column(
            "metadata",
            postgresql.JSONB(astext_type=sa.Text()).with_variant(sa.JSON(), "sqlite"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["document_id"], ["knowledge_document.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("document_id", "chunk_index", name="uq_knowledge_chunk_doc_index"),
    )
    op.create_index("ix_knowledge_chunk_document_id", "knowledge_chunk", ["document_id"])

    op.create_table(
        "knowledge_embedding",
        sa.Column("chunk_id", sa.Integer(), nullable=False),
        sa.Column(
            "embedding",
            postgresql.JSONB(astext_type=sa.Text()).with_variant(sa.JSON(), "sqlite"),
            nullable=False,
        ),
        sa.Column("embedding_model", sa.String(length=128), nullable=False),
        sa.Column(
            "embedded_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["chunk_id"], ["knowledge_chunk.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("chunk_id"),
    )

    if bind.dialect.name == "postgresql":
        op.execute(
            f"ALTER TABLE knowledge_embedding "
            f"ADD COLUMN embedding_vec vector({_EMBEDDING_DIMS})"
        )
        op.execute(
            "CREATE INDEX ix_knowledge_embedding_vec_hnsw "
            "ON knowledge_embedding "
            "USING hnsw (embedding_vec vector_cosine_ops)"
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("DROP INDEX IF EXISTS ix_knowledge_embedding_vec_hnsw")
    op.drop_table("knowledge_embedding")
    op.drop_index("ix_knowledge_chunk_document_id", table_name="knowledge_chunk")
    op.drop_table("knowledge_chunk")
    op.drop_index("ix_knowledge_document_slug", table_name="knowledge_document")
    op.drop_index("ix_knowledge_document_location_id", table_name="knowledge_document")
    op.drop_index("ix_knowledge_document_workspace_id", table_name="knowledge_document")
    op.drop_index("ix_knowledge_document_scope_type", table_name="knowledge_document")
    op.drop_index("ix_knowledge_document_status", table_name="knowledge_document")
    op.drop_index("ix_knowledge_document_category", table_name="knowledge_document")
    op.drop_table("knowledge_document")
