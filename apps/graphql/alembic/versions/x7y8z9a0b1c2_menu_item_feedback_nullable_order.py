"""menu_item_feedback: nullable pos_order_id + pending uniqueness

Revision ID: x7y8z9a0b1c2
Revises: w6x7y8z9a0b1
Create Date: 2026-10-12

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "x7y8z9a0b1c2"
down_revision: str | Sequence[str] | None = "w6x7y8z9a0b1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint(
        "uq_menu_item_feedback_user_item_order",
        "menu_item_feedback",
        type_="unique",
    )
    op.alter_column(
        "menu_item_feedback",
        "pos_order_id",
        existing_type=sa.Integer(),
        nullable=True,
    )
    op.create_index(
        "uq_menu_item_feedback_pending_user_item",
        "menu_item_feedback",
        ["clerk_user_id", "menu_item_id"],
        unique=True,
        postgresql_where=sa.text("status = 'pending'"),
        sqlite_where=sa.text("status = 'pending'"),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_menu_item_feedback_pending_user_item",
        table_name="menu_item_feedback",
    )
    op.alter_column(
        "menu_item_feedback",
        "pos_order_id",
        existing_type=sa.Integer(),
        nullable=False,
    )
    op.create_unique_constraint(
        "uq_menu_item_feedback_user_item_order",
        "menu_item_feedback",
        ["clerk_user_id", "menu_item_id", "pos_order_id"],
    )
