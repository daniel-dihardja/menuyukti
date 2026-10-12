"""menu.allow_dine_in / allow_pickup for digital-menu fulfillment config

Revision ID: u4v5w6x7y8z9
Revises: t3u4v5w6x7y8
Create Date: 2026-10-12

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "u4v5w6x7y8z9"
down_revision: str | Sequence[str] | None = "t3u4v5w6x7y8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "menu",
        sa.Column(
            "allow_dine_in",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
    )
    op.add_column(
        "menu",
        sa.Column(
            "allow_pickup",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
    )


def downgrade() -> None:
    op.drop_column("menu", "allow_pickup")
    op.drop_column("menu", "allow_dine_in")
