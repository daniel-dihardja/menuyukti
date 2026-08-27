"""Add storage_zone to inventory_catalog_item

Revision ID: d0e1f2a3b4c5
Revises: c9d0e1f2a3b4
Create Date: 2026-08-27

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "d0e1f2a3b4c5"
down_revision: str | Sequence[str] | None = "c9d0e1f2a3b4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "inventory_catalog_item",
        sa.Column(
            "storage_zone",
            sa.String(length=32),
            server_default="dry",
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("inventory_catalog_item", "storage_zone")
