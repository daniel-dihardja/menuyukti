"""menu.ordering_enabled for browse-only public digital menus

Revision ID: a0b1c2d3e4f5
Revises: e4f5a6b7c8d9
Create Date: 2026-10-26

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "a0b1c2d3e4f5"
down_revision: str | Sequence[str] | None = "e4f5a6b7c8d9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "menu",
        sa.Column(
            "ordering_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
    )


def downgrade() -> None:
    op.drop_column("menu", "ordering_enabled")
