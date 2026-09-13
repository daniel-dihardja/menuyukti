"""menu_item.image_filename for optional media-library photo

Revision ID: s5t6u7v8w9x0
Revises: r4s5t6u7v8w9
Create Date: 2026-09-13

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "s5t6u7v8w9x0"
down_revision: str | Sequence[str] | None = "r4s5t6u7v8w9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "menu_item",
        sa.Column("image_filename", sa.String(length=512), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("menu_item", "image_filename")
