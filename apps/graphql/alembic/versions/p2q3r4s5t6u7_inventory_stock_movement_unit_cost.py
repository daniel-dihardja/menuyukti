"""Add nullable unit_cost to inventory_stock_movement

Revision ID: p2q3r4s5t6u7
Revises: o1p2q3r4s5t6
Create Date: 2026-09-08

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "p2q3r4s5t6u7"
down_revision: str | Sequence[str] | None = "o1p2q3r4s5t6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "inventory_stock_movement",
        sa.Column("unit_cost", sa.Float(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("inventory_stock_movement", "unit_cost")
