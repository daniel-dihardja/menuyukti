"""workspace.plan for free/pro product tiers

Revision ID: v8w9x0y1z2a3
Revises: u7v8w9x0y1z2
Create Date: 2026-09-14

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy import text

from alembic import op

revision: str = "v8w9x0y1z2a3"
down_revision: str | Sequence[str] | None = "u7v8w9x0y1z2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "workspace",
        sa.Column("plan", sa.String(length=32), nullable=False, server_default="free"),
    )
    # Existing tenants keep full access; new workspaces use the column default (free).
    op.execute(text("UPDATE workspace SET plan = 'pro'"))


def downgrade() -> None:
    op.drop_column("workspace", "plan")
