"""menu.allow_delivery + pos_order delivery address fields

Revision ID: z9a0b1c2d3e4
Revises: y8z9a0b1c2d3
Create Date: 2026-10-13

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "z9a0b1c2d3e4"
down_revision: str | Sequence[str] | None = "y8z9a0b1c2d3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "menu",
        sa.Column(
            "allow_delivery",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.add_column(
        "pos_order",
        sa.Column("delivery_address", sa.Text(), nullable=True),
    )
    op.add_column(
        "pos_order",
        sa.Column("delivery_phone", sa.String(length=32), nullable=True),
    )
    op.add_column(
        "pos_order",
        sa.Column("delivery_notes", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("pos_order", "delivery_notes")
    op.drop_column("pos_order", "delivery_phone")
    op.drop_column("pos_order", "delivery_address")
    op.drop_column("menu", "allow_delivery")
