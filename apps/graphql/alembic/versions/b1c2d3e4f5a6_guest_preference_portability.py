"""guest preference portability and dual-purpose fields

Revision ID: b1c2d3e4f5a6
Revises: a0b1c2d3e4f5
Create Date: 2026-10-13

Additive columns for Food Profile portability controls and global switch.
Does not backfill historical votes/orders or enable profiling for existing users.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "b1c2d3e4f5a6"
down_revision: str | Sequence[str] | None = "a0b1c2d3e4f5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "guest_preference_profile",
        sa.Column(
            "cross_venue_personalization_enabled",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
    )

    op.add_column(
        "guest_preference_signal",
        sa.Column(
            "origin_kind",
            sa.String(length=32),
            server_default=sa.text("'inferred'"),
            nullable=False,
        ),
    )
    op.add_column(
        "guest_preference_signal",
        sa.Column("explanation", sa.Text(), nullable=True),
    )
    op.add_column(
        "guest_preference_signal",
        sa.Column("origin_location_id", sa.Integer(), nullable=True),
    )
    op.add_column(
        "guest_preference_signal",
        sa.Column(
            "portability_enabled",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
    )
    op.add_column(
        "guest_preference_signal",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.add_column(
        "guest_preference_signal",
        sa.Column("removed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        op.f("ix_guest_preference_signal_origin_location_id"),
        "guest_preference_signal",
        ["origin_location_id"],
        unique=False,
    )
    op.create_foreign_key(
        op.f("fk_guest_preference_signal_origin_location_id_location"),
        "guest_preference_signal",
        "location",
        ["origin_location_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        op.f("fk_guest_preference_signal_origin_location_id_location"),
        "guest_preference_signal",
        type_="foreignkey",
    )
    op.drop_index(
        op.f("ix_guest_preference_signal_origin_location_id"),
        table_name="guest_preference_signal",
    )
    op.drop_column("guest_preference_signal", "removed_at")
    op.drop_column("guest_preference_signal", "updated_at")
    op.drop_column("guest_preference_signal", "portability_enabled")
    op.drop_column("guest_preference_signal", "origin_location_id")
    op.drop_column("guest_preference_signal", "explanation")
    op.drop_column("guest_preference_signal", "origin_kind")
    op.drop_column(
        "guest_preference_profile",
        "cross_venue_personalization_enabled",
    )
