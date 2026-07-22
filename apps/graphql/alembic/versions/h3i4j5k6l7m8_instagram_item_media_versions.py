"""instagram_item_media_versions: version history per Instagram item image.

Revision ID: h3i4j5k6l7m8
Revises: g2h3i4j5k6l7
Create Date: 2026-07-22

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "h3i4j5k6l7m8"
down_revision: str | Sequence[str] | None = "g2h3i4j5k6l7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "instagram_item_media_versions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("instagram_item_id", sa.Integer(), nullable=False),
        sa.Column("media_s3_key", sa.String(length=512), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["instagram_item_id"],
            ["instagram_items.id"],
            name=op.f("fk_instagram_item_media_versions_instagram_item_id_instagram_items"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_instagram_item_media_versions")),
        sa.UniqueConstraint(
            "instagram_item_id",
            "media_s3_key",
            name="uq_instagram_item_media_version_item_key",
        ),
    )
    op.create_index(
        op.f("ix_instagram_item_media_versions_instagram_item_id"),
        "instagram_item_media_versions",
        ["instagram_item_id"],
        unique=False,
    )

    # Backfill one version per item that already has media.
    op.execute(
        sa.text(
            """
            INSERT INTO instagram_item_media_versions (
                instagram_item_id, media_s3_key, prompt, created_at
            )
            SELECT id, media_s3_key, generation_prompt, COALESCE(updated_at, created_at)
            FROM instagram_items
            WHERE media_s3_key IS NOT NULL
            """
        )
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_instagram_item_media_versions_instagram_item_id"),
        table_name="instagram_item_media_versions",
    )
    op.drop_table("instagram_item_media_versions")
