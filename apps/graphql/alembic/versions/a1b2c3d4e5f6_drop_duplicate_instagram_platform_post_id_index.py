"""drop duplicate instagram_posts.platform_post_id index

Revision ID: a1b2c3d4e5f6
Revises: 9edc30659c43
Create Date: 2026-04-09

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: str | Sequence[str] | None = "9edc30659c43"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Drop auto-generated duplicate index; keep ix_instagram_post_platform_post_id."""
    op.drop_index(
        op.f("ix_instagram_posts_platform_post_id"),
        table_name="instagram_posts",
    )


def downgrade() -> None:
    """Restore the dropped index (matches initial_schema Column index=True)."""
    op.create_index(
        op.f("ix_instagram_posts_platform_post_id"),
        "instagram_posts",
        ["platform_post_id"],
        unique=False,
    )
