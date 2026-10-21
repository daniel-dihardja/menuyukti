"""pickup_offer table for location-scoped leftover pickup offers

Revision ID: d3e4f5a6b7c8
Revises: c2d3e4f5a6b7
Create Date: 2026-10-20

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "d3e4f5a6b7c8"
down_revision: str | Sequence[str] | None = "c2d3e4f5a6b7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "pickup_offer",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("location_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=256), nullable=False),
        sa.Column(
            "description",
            sa.Text(),
            server_default="",
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.String(length=32),
            server_default=sa.text("'open'"),
            nullable=False,
        ),
        sa.Column("available_from", sa.DateTime(timezone=True), nullable=False),
        sa.Column("available_until", sa.DateTime(timezone=True), nullable=False),
        sa.Column("price", sa.Float(), nullable=True),
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
            name=op.f("fk_pickup_offer_location_id_location"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_pickup_offer")),
    )
    op.create_index(
        op.f("ix_pickup_offer_location_id"),
        "pickup_offer",
        ["location_id"],
        unique=False,
    )
    op.create_index(
        "ix_pickup_offer_location_status",
        "pickup_offer",
        ["location_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_pickup_offer_location_available_until",
        "pickup_offer",
        ["location_id", "available_until"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_pickup_offer_location_available_until", table_name="pickup_offer")
    op.drop_index("ix_pickup_offer_location_status", table_name="pickup_offer")
    op.drop_index(op.f("ix_pickup_offer_location_id"), table_name="pickup_offer")
    op.drop_table("pickup_offer")
