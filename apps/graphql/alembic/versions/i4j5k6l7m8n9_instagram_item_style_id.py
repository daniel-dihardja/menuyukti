"""instagram_items: optional style_id FK to visual_style

Revision ID: i4j5k6l7m8n9
Revises: h3i4j5k6l7m8
Create Date: 2026-07-22

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "i4j5k6l7m8n9"
down_revision: str | Sequence[str] | None = "h3i4j5k6l7m8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("instagram_items", sa.Column("style_id", sa.Integer(), nullable=True))
    op.create_index(
        op.f("ix_instagram_items_style_id"),
        "instagram_items",
        ["style_id"],
        unique=False,
    )
    op.create_foreign_key(
        op.f("fk_instagram_items_style_id_visual_style"),
        "instagram_items",
        "visual_style",
        ["style_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        op.f("fk_instagram_items_style_id_visual_style"),
        "instagram_items",
        type_="foreignkey",
    )
    op.drop_index(op.f("ix_instagram_items_style_id"), table_name="instagram_items")
    op.drop_column("instagram_items", "style_id")
