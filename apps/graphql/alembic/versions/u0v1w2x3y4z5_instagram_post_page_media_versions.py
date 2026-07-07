"""instagram_post_page_media_versions: version history per post page image.

Revision ID: u0v1w2x3y4z5
Revises: t9u0v1w2x3y4
Create Date: 2026-07-07

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "u0v1w2x3y4z5"
down_revision: str | Sequence[str] | None = "t9u0v1w2x3y4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "instagram_post_page_media_versions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("post_page_id", sa.Integer(), nullable=False),
        sa.Column("media_s3_key", sa.String(length=512), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["post_page_id"],
            ["instagram_post_pages.id"],
            name=op.f("fk_instagram_post_page_media_versions_post_page_id_instagram_post_pages"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_instagram_post_page_media_versions")),
        sa.UniqueConstraint(
            "post_page_id",
            "media_s3_key",
            name="uq_instagram_post_page_media_version_page_key",
        ),
    )
    op.create_index(
        op.f("ix_instagram_post_page_media_versions_post_page_id"),
        "instagram_post_page_media_versions",
        ["post_page_id"],
        unique=False,
    )

    # Backfill one version per page that already has media.
    op.execute(
        sa.text(
            """
            INSERT INTO instagram_post_page_media_versions (post_page_id, media_s3_key, prompt, created_at)
            SELECT id, media_s3_key, prompt, COALESCE(updated_at, created_at)
            FROM instagram_post_pages
            WHERE media_s3_key IS NOT NULL
            """
        )
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_instagram_post_page_media_versions_post_page_id"),
        table_name="instagram_post_page_media_versions",
    )
    op.drop_table("instagram_post_page_media_versions")
