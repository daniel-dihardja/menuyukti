"""pos_order.refunded_at for post-pay refunds

Revision ID: b4c5d6e7f8a9
Revises: a3b4c5d6e7f8
Create Date: 2026-09-18

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "b4c5d6e7f8a9"
down_revision: str | Sequence[str] | None = "a3b4c5d6e7f8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "pos_order",
        sa.Column("refunded_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("pos_order", "refunded_at")
