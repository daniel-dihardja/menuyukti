"""instagram_post_pages: persist generation format, quality, and model.

Revision ID: z5a6b7c8d9e0
Revises: y4z5a6b7c8d9
Create Date: 2026-07-20

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "z5a6b7c8d9e0"
down_revision: str | Sequence[str] | None = "y4z5a6b7c8d9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "instagram_post_pages",
        sa.Column("image_format", sa.String(length=32), nullable=True),
    )
    op.add_column(
        "instagram_post_pages",
        sa.Column("image_quality", sa.String(length=32), nullable=True),
    )
    op.add_column(
        "instagram_post_pages",
        sa.Column("generation_model", sa.String(length=64), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("instagram_post_pages", "generation_model")
    op.drop_column("instagram_post_pages", "image_quality")
    op.drop_column("instagram_post_pages", "image_format")
