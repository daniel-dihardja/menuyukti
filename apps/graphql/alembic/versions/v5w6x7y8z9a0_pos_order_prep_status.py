"""pos_order.prep_status for digital-menu prep / fulfillment

Revision ID: v5w6x7y8z9a0
Revises: u4v5w6x7y8z9
Create Date: 2026-10-12

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "v5w6x7y8z9a0"
down_revision: str | Sequence[str] | None = "u4v5w6x7y8z9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "pos_order",
        sa.Column("prep_status", sa.String(length=16), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("pos_order", "prep_status")
