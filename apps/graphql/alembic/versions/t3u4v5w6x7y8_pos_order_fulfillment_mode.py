"""pos_order.fulfillment_mode for digital-menu dine_in / pickup

Revision ID: t3u4v5w6x7y8
Revises: s2t3u4v5w6x7
Create Date: 2026-10-12

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "t3u4v5w6x7y8"
down_revision: str | Sequence[str] | None = "s2t3u4v5w6x7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "pos_order",
        sa.Column("fulfillment_mode", sa.String(length=16), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("pos_order", "fulfillment_mode")
