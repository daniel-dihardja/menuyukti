"""point_ledger_entry: Clerk-keyed guest point ledger

Revision ID: k4l5m6n7o8p9
Revises: j3k4l5m6n7o8
Create Date: 2026-10-07

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "k4l5m6n7o8p9"
down_revision: str | Sequence[str] | None = "j3k4l5m6n7o8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "point_ledger_entry",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("clerk_user_id", sa.String(length=128), nullable=False),
        sa.Column("location_id", sa.Integer(), nullable=False),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("action_key", sa.String(length=64), nullable=False),
        sa.Column("source_ref", sa.String(length=128), nullable=False),
        sa.Column("label", sa.String(length=256), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["location_id"],
            ["location.id"],
            name=op.f("fk_point_ledger_entry_location_id_location"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_point_ledger_entry")),
        sa.UniqueConstraint(
            "clerk_user_id",
            "location_id",
            "action_key",
            "source_ref",
            name="uq_point_ledger_entry_user_location_action_source",
        ),
    )
    op.create_index(
        op.f("ix_point_ledger_entry_location_id"),
        "point_ledger_entry",
        ["location_id"],
        unique=False,
    )
    op.create_index(
        "ix_point_ledger_entry_clerk_user_id",
        "point_ledger_entry",
        ["clerk_user_id"],
        unique=False,
    )
    op.create_index(
        "ix_point_ledger_entry_clerk_user_created",
        "point_ledger_entry",
        ["clerk_user_id", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_point_ledger_entry_clerk_user_created",
        table_name="point_ledger_entry",
    )
    op.drop_index(
        "ix_point_ledger_entry_clerk_user_id",
        table_name="point_ledger_entry",
    )
    op.drop_index(
        op.f("ix_point_ledger_entry_location_id"),
        table_name="point_ledger_entry",
    )
    op.drop_table("point_ledger_entry")
