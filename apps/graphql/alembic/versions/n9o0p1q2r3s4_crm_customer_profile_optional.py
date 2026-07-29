"""Make CRM customer phone optional; add given/family name.

Revision ID: n9o0p1q2r3s4
Revises: m8n9o0p1q2r3
Create Date: 2026-07-28

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "n9o0p1q2r3s4"
down_revision: str | Sequence[str] | None = "m8n9o0p1q2r3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column(
        "crm_customer",
        "phone_e164",
        existing_type=sa.String(length=32),
        nullable=True,
    )
    op.add_column("crm_customer", sa.Column("given_name", sa.String(length=128), nullable=True))
    op.add_column("crm_customer", sa.Column("family_name", sa.String(length=128), nullable=True))


def downgrade() -> None:
    op.drop_column("crm_customer", "family_name")
    op.drop_column("crm_customer", "given_name")
    op.execute("UPDATE crm_customer SET phone_e164 = '+00000000000' WHERE phone_e164 IS NULL")
    op.alter_column(
        "crm_customer",
        "phone_e164",
        existing_type=sa.String(length=32),
        nullable=False,
    )
