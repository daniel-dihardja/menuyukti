"""crm_cashback_entry: customer cashback ledger

Revision ID: q2r3s4t5u6v7
Revises: p1q2r3s4t5u6
Create Date: 2026-07-28

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "q2r3s4t5u6v7"
down_revision: str | Sequence[str] | None = "p1q2r3s4t5u6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "crm_cashback_entry",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("customer_id", sa.Uuid(), nullable=False),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("label", sa.String(length=256), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["customer_id"],
            ["crm_customer.id"],
            name=op.f("fk_crm_cashback_entry_customer_id_crm_customer"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_crm_cashback_entry")),
    )
    op.create_index(
        op.f("ix_crm_cashback_entry_customer_id"),
        "crm_cashback_entry",
        ["customer_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_crm_cashback_entry_customer_id"), table_name="crm_cashback_entry")
    op.drop_table("crm_cashback_entry")
