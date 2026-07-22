"""add media_s3_key and generation_prompt to instagram_items

Revision ID: f1a2b3c4d5e6
Revises: e0f1a2b3c4d5
Create Date: 2026-07-22

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "f1a2b3c4d5e6"
down_revision: str | Sequence[str] | None = "e0f1a2b3c4d5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "instagram_items",
        sa.Column("media_s3_key", sa.String(length=512), nullable=True),
    )
    op.add_column(
        "instagram_items",
        sa.Column("generation_prompt", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("instagram_items", "generation_prompt")
    op.drop_column("instagram_items", "media_s3_key")
