"""drop location_social_settings table

Revision ID: h1i2j3k4l5m6
Revises: g8h7i6j5k4l3
Create Date: 2026-05-08

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "h1i2j3k4l5m6"
down_revision: str | Sequence[str] | None = "g8h7i6j5k4l3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_index(
        op.f("ix_location_social_settings_location_id"), table_name="location_social_settings"
    )
    op.drop_table("location_social_settings")


def downgrade() -> None:
    op.create_table(
        "location_social_settings",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("location_id", sa.Integer(), nullable=False),
        sa.Column("tone", sa.Text(), nullable=True),
        sa.Column("brand_personality", sa.Text(), nullable=True),
        sa.Column(
            "content_pillars",
            postgresql.JSONB(astext_type=sa.Text()).with_variant(sa.JSON(), "sqlite"),
            nullable=True,
        ),
        sa.Column(
            "platform_focus",
            postgresql.JSONB(astext_type=sa.Text()).with_variant(sa.JSON(), "sqlite"),
            nullable=True,
        ),
        sa.Column(
            "brand_hashtags",
            postgresql.JSONB(astext_type=sa.Text()).with_variant(sa.JSON(), "sqlite"),
            nullable=True,
        ),
        sa.Column(
            "avoid_topics",
            postgresql.JSONB(astext_type=sa.Text()).with_variant(sa.JSON(), "sqlite"),
            nullable=True,
        ),
        sa.Column("target_audience", sa.Text(), nullable=True),
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
            name=op.f("fk_location_social_settings_location_id_location"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_location_social_settings")),
        sa.UniqueConstraint("location_id", name=op.f("uq_location_social_settings_location_id")),
    )
    op.create_index(
        op.f("ix_location_social_settings_location_id"),
        "location_social_settings",
        ["location_id"],
        unique=False,
    )
