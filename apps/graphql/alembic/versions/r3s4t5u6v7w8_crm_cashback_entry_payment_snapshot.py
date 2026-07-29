"""crm_cashback_entry: payment_amount and cashback_percent snapshot

Revision ID: r3s4t5u6v7w8
Revises: q2r3s4t5u6v7
Create Date: 2026-07-28

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "r3s4t5u6v7w8"
down_revision: str | Sequence[str] | None = "q2r3s4t5u6v7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "crm_cashback_entry",
        sa.Column("payment_amount", sa.Integer(), nullable=True),
    )
    op.add_column(
        "crm_cashback_entry",
        sa.Column("cashback_percent", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("crm_cashback_entry", "cashback_percent")
    op.drop_column("crm_cashback_entry", "payment_amount")
