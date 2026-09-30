"""service_subscription: per-location service entitlements

Revision ID: g0h1i2j3k4l5
Revises: f9a0b1c2d3e4
Create Date: 2026-09-30

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "g0h1i2j3k4l5"
down_revision: str | Sequence[str] | None = "f9a0b1c2d3e4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "service_subscription",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("workspace_id", sa.Integer(), nullable=False),
        sa.Column("location_id", sa.Integer(), nullable=False),
        sa.Column("service_key", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="active"),
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
        sa.Column("canceled_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["workspace_id"],
            ["workspace.id"],
            name=op.f("fk_service_subscription_workspace_id_workspace"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["location_id"],
            ["location.id"],
            name=op.f("fk_service_subscription_location_id_location"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_service_subscription")),
        sa.UniqueConstraint(
            "location_id",
            "service_key",
            name="uq_service_subscription_location_service",
        ),
    )
    op.create_index(
        op.f("ix_service_subscription_workspace_id"),
        "service_subscription",
        ["workspace_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_service_subscription_location_id"),
        "service_subscription",
        ["location_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_service_subscription_location_id"), table_name="service_subscription")
    op.drop_index(op.f("ix_service_subscription_workspace_id"), table_name="service_subscription")
    op.drop_table("service_subscription")
