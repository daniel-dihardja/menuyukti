"""drop location_frontpage table (digital menu replaced guest frontpage)

Revision ID: f9a0b1c2d3e4
Revises: e8f9a0b1c2d3
Create Date: 2026-09-30

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "f9a0b1c2d3e4"
down_revision: str | Sequence[str] | None = "e8f9a0b1c2d3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_jsonb = postgresql.JSONB(astext_type=sa.Text()).with_variant(sa.JSON(), "sqlite")


def upgrade() -> None:
    op.drop_index(op.f("ix_location_frontpage_location_id"), table_name="location_frontpage")
    op.drop_table("location_frontpage")


def downgrade() -> None:
    op.create_table(
        "location_frontpage",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("location_id", sa.Integer(), nullable=False),
        sa.Column("tagline", sa.String(length=512), nullable=True),
        sa.Column(
            "show_guest_favorites",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "show_popular_combos",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "favorite_images",
            _jsonb,
            nullable=False,
            server_default=sa.text("'[]'"),
        ),
        sa.Column(
            "combo_images",
            _jsonb,
            nullable=False,
            server_default=sa.text("'[]'"),
        ),
        sa.Column(
            "wall_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["location_id"],
            ["location.id"],
            name=op.f("fk_location_frontpage_location_id_location"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_location_frontpage")),
        sa.UniqueConstraint("location_id", name=op.f("uq_location_frontpage_location_id")),
    )
    op.create_index(
        op.f("ix_location_frontpage_location_id"),
        "location_frontpage",
        ["location_id"],
        unique=False,
    )
