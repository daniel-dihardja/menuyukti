"""instagram_post_pages: carousel pages per post with media S3 keys.

Revision ID: t9u0v1w2x3y4
Revises: s8t9u0v1w2x3
Create Date: 2026-07-07

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "t9u0v1w2x3y4"
down_revision: str | Sequence[str] | None = "s8t9u0v1w2x3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "instagram_post_pages",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("post_id", sa.Integer(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("media_s3_key", sa.String(length=512), nullable=True),
        sa.Column("prompt", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["post_id"],
            ["instagram_posts.id"],
            name=op.f("fk_instagram_post_pages_post_id_instagram_posts"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_instagram_post_pages")),
        sa.UniqueConstraint(
            "post_id",
            "sort_order",
            name="uq_instagram_post_page_post_sort_order",
        ),
    )
    op.create_index(
        op.f("ix_instagram_post_pages_post_id"),
        "instagram_post_pages",
        ["post_id"],
        unique=False,
    )

    # Backfill one default page per existing post.
    op.execute(
        sa.text(
            """
            INSERT INTO instagram_post_pages (post_id, sort_order)
            SELECT id, 0 FROM instagram_posts
            """
        )
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_instagram_post_pages_post_id"), table_name="instagram_post_pages")
    op.drop_table("instagram_post_pages")
