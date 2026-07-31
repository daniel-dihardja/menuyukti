"""ai_usage_event: append-only AI usage ledger for Leonardo (and future providers).

Revision ID: a7b8c9d0e1f2
Revises: t6u7v8w9x0y1
Create Date: 2026-07-31

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "a7b8c9d0e1f2"
down_revision: str | Sequence[str] | None = "t6u7v8w9x0y1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "ai_usage_event",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.String(length=128), nullable=False),
        sa.Column("provider", sa.String(length=64), nullable=False),
        sa.Column("feature", sa.String(length=64), nullable=False),
        sa.Column("model", sa.String(length=128), nullable=True),
        sa.Column("external_id", sa.String(length=256), nullable=True),
        sa.Column("units", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column(
            "metadata",
            postgresql.JSONB(astext_type=sa.Text()).with_variant(sa.JSON(), "sqlite"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ai_usage_event_user_id", "ai_usage_event", ["user_id"], unique=False)
    op.create_index(
        "ix_ai_usage_event_created_at",
        "ai_usage_event",
        ["created_at"],
        unique=False,
    )
    op.create_index(
        "ix_ai_usage_event_user_created",
        "ai_usage_event",
        ["user_id", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_ai_usage_event_user_created", table_name="ai_usage_event")
    op.drop_index("ix_ai_usage_event_created_at", table_name="ai_usage_event")
    op.drop_index("ix_ai_usage_event_user_id", table_name="ai_usage_event")
    op.drop_table("ai_usage_event")
