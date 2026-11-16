"""drop CRM tables (apps, customers, devices, cashback, auth)

Revision ID: i3j4k5l6m7n8
Revises: h2i3j4k5l6m7
Create Date: 2026-11-16

"""

from collections.abc import Sequence

from alembic import op

revision: str = "i3j4k5l6m7n8"
down_revision: str | Sequence[str] | None = "h2i3j4k5l6m7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # FK-safe order: dependents first, then parents.
    op.drop_table("crm_cashback_entry")
    op.drop_table("crm_auth_challenge")
    op.drop_table("crm_audit_event")
    op.drop_table("crm_enrollment_token")
    op.drop_table("crm_device")
    op.drop_table("crm_customer")
    op.drop_table("crm_app")


def downgrade() -> None:
    # Irreversible: historical create migrations remain for schema archaeology.
    raise NotImplementedError(
        "CRM tables were removed; restore from historical Alembic revisions "
        "l7m8n9o0p1q2…r3s4t5u6v7w8 if needed."
    )
