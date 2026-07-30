"""drop Instagram item tables (workflow drafts feature removed)

Revision ID: s4t5u6v7w8x9
Revises: c4d5e6f7a8b9
Create Date: 2026-07-30

"""

from collections.abc import Sequence

from alembic import op

revision: str = "s4t5u6v7w8x9"
down_revision: str | Sequence[str] | None = "c4d5e6f7a8b9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_table("instagram_item_page_media_versions")
    op.drop_table("instagram_item_pages")
    op.drop_table("instagram_items")


def downgrade() -> None:
    # Tables were removed with the Instagram items product feature; recreate via
    # historical migrations if a full restore is needed.
    raise NotImplementedError("Cannot downgrade drop of Instagram item tables")
