"""menu_item_feedback: nullable sentiment

Revision ID: y8z9a0b1c2d3
Revises: x7y8z9a0b1c2
Create Date: 2026-10-12

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "y8z9a0b1c2d3"
down_revision: str | Sequence[str] | None = "x7y8z9a0b1c2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column(
        "menu_item_feedback",
        "sentiment",
        existing_type=sa.String(length=16),
        nullable=True,
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            "UPDATE menu_item_feedback SET sentiment = 'positive' WHERE sentiment IS NULL"
        )
    )
    op.alter_column(
        "menu_item_feedback",
        "sentiment",
        existing_type=sa.String(length=16),
        nullable=False,
    )
