"""crm_app: cashback threshold and percent config

Revision ID: p1q2r3s4t5u6
Revises: o0p1q2r3s4t5
Create Date: 2026-07-28

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "p1q2r3s4t5u6"
down_revision: str | Sequence[str] | None = "o0p1q2r3s4t5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "crm_app",
        sa.Column(
            "cashback_threshold_amount",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),
    )
    op.add_column(
        "crm_app",
        sa.Column(
            "cashback_percent",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("crm_app", "cashback_percent")
    op.drop_column("crm_app", "cashback_threshold_amount")
