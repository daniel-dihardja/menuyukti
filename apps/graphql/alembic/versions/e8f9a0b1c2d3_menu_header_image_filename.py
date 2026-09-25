"""menu.header_image_filename for public digital menu header

Revision ID: e8f9a0b1c2d3
Revises: d6e7f8a9b0c1
Create Date: 2026-09-26

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "e8f9a0b1c2d3"
down_revision: str | Sequence[str] | None = "d6e7f8a9b0c1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "menu",
        sa.Column("header_image_filename", sa.String(length=512), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("menu", "header_image_filename")
