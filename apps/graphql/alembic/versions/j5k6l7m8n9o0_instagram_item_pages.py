"""instagram_item_pages: multi-page media with per-page versions.

Revision ID: j5k6l7m8n9o0
Revises: i4j5k6l7m8n9
Create Date: 2026-07-23

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "j5k6l7m8n9o0"
down_revision: str | Sequence[str] | None = "i4j5k6l7m8n9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "instagram_item_pages",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("instagram_item_id", sa.Integer(), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default=sa.text("0"), nullable=False),
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
            ["instagram_item_id"],
            ["instagram_items.id"],
            name=op.f("fk_instagram_item_pages_instagram_item_id_instagram_items"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_instagram_item_pages")),
        sa.UniqueConstraint(
            "instagram_item_id",
            "sort_order",
            name="uq_instagram_item_page_item_sort_order",
        ),
    )
    op.create_index(
        op.f("ix_instagram_item_pages_instagram_item_id"),
        "instagram_item_pages",
        ["instagram_item_id"],
        unique=False,
    )

    op.create_table(
        "instagram_item_page_media_versions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("instagram_item_page_id", sa.Integer(), nullable=False),
        sa.Column("media_s3_key", sa.String(length=512), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["instagram_item_page_id"],
            ["instagram_item_pages.id"],
            name=op.f(
                "fk_instagram_item_page_media_versions_instagram_item_page_id_instagram_item_pages"
            ),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_instagram_item_page_media_versions")),
        sa.UniqueConstraint(
            "instagram_item_page_id",
            "media_s3_key",
            name="uq_instagram_item_page_media_version_page_key",
        ),
    )
    op.create_index(
        op.f("ix_instagram_item_page_media_versions_instagram_item_page_id"),
        "instagram_item_page_media_versions",
        ["instagram_item_page_id"],
        unique=False,
    )

    # Seed page 0 for every existing item; copy committed media + generation prompt.
    op.execute(
        sa.text(
            """
            INSERT INTO instagram_item_pages (
                instagram_item_id, sort_order, media_s3_key, prompt, created_at, updated_at
            )
            SELECT
                id,
                0,
                media_s3_key,
                generation_prompt,
                created_at,
                updated_at
            FROM instagram_items
            """
        )
    )

    # Move item-level versions onto the new page 0 rows.
    op.execute(
        sa.text(
            """
            INSERT INTO instagram_item_page_media_versions (
                instagram_item_page_id, media_s3_key, prompt, created_at
            )
            SELECT
                p.id,
                v.media_s3_key,
                v.prompt,
                v.created_at
            FROM instagram_item_media_versions v
            JOIN instagram_item_pages p
              ON p.instagram_item_id = v.instagram_item_id
             AND p.sort_order = 0
            """
        )
    )

    # If an item had media but no version row (legacy), backfill one version from the page.
    op.execute(
        sa.text(
            """
            INSERT INTO instagram_item_page_media_versions (
                instagram_item_page_id, media_s3_key, prompt, created_at
            )
            SELECT
                p.id,
                p.media_s3_key,
                p.prompt,
                COALESCE(p.updated_at, p.created_at)
            FROM instagram_item_pages p
            WHERE p.media_s3_key IS NOT NULL
              AND NOT EXISTS (
                SELECT 1
                FROM instagram_item_page_media_versions v
                WHERE v.instagram_item_page_id = p.id
                  AND v.media_s3_key = p.media_s3_key
              )
            """
        )
    )

    op.drop_index(
        op.f("ix_instagram_item_media_versions_instagram_item_id"),
        table_name="instagram_item_media_versions",
    )
    op.drop_table("instagram_item_media_versions")
    op.drop_column("instagram_items", "media_s3_key")


def downgrade() -> None:
    op.add_column(
        "instagram_items",
        sa.Column("media_s3_key", sa.String(length=512), nullable=True),
    )

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

    # Restore item media from page 0.
    op.execute(
        sa.text(
            """
            UPDATE instagram_items AS i
            SET media_s3_key = p.media_s3_key
            FROM instagram_item_pages AS p
            WHERE p.instagram_item_id = i.id
              AND p.sort_order = 0
            """
        )
    )

    op.execute(
        sa.text(
            """
            INSERT INTO instagram_item_media_versions (
                instagram_item_id, media_s3_key, prompt, created_at
            )
            SELECT
                p.instagram_item_id,
                v.media_s3_key,
                v.prompt,
                v.created_at
            FROM instagram_item_page_media_versions v
            JOIN instagram_item_pages p ON p.id = v.instagram_item_page_id
            WHERE p.sort_order = 0
            """
        )
    )

    op.drop_index(
        op.f("ix_instagram_item_page_media_versions_instagram_item_page_id"),
        table_name="instagram_item_page_media_versions",
    )
    op.drop_table("instagram_item_page_media_versions")
    op.drop_index(
        op.f("ix_instagram_item_pages_instagram_item_id"),
        table_name="instagram_item_pages",
    )
    op.drop_table("instagram_item_pages")
