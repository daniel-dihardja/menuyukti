"""media_asset, media_collection, media_collection_member tables

Revision ID: c4d5e6f7a8b9
Revises: r3s4t5u6v7w8
Create Date: 2026-07-29

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "c4d5e6f7a8b9"
down_revision: str | Sequence[str] | None = "r3s4t5u6v7w8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "media_asset",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("workspace_id", sa.Integer(), nullable=False),
        sa.Column("filename", sa.String(length=512), nullable=False),
        sa.Column("display_name", sa.String(length=256), nullable=True),
        sa.Column("created_by_clerk_user_id", sa.String(length=128), nullable=False),
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
            ["workspace_id"],
            ["workspace.id"],
            name=op.f("fk_media_asset_workspace_id_workspace"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_media_asset")),
        sa.UniqueConstraint(
            "workspace_id",
            "filename",
            name="uq_media_asset_workspace_filename",
        ),
    )
    op.create_index(
        op.f("ix_media_asset_workspace_id"),
        "media_asset",
        ["workspace_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_media_asset_created_by_clerk_user_id"),
        "media_asset",
        ["created_by_clerk_user_id"],
        unique=False,
    )

    op.create_table(
        "media_collection",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("workspace_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("created_by_clerk_user_id", sa.String(length=128), nullable=False),
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
            ["workspace_id"],
            ["workspace.id"],
            name=op.f("fk_media_collection_workspace_id_workspace"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_media_collection")),
        sa.UniqueConstraint(
            "workspace_id",
            "name",
            name="uq_media_collection_workspace_name",
        ),
    )
    op.create_index(
        op.f("ix_media_collection_workspace_id"),
        "media_collection",
        ["workspace_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_media_collection_created_by_clerk_user_id"),
        "media_collection",
        ["created_by_clerk_user_id"],
        unique=False,
    )

    op.create_table(
        "media_collection_member",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("collection_id", sa.Integer(), nullable=False),
        sa.Column("asset_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["asset_id"],
            ["media_asset.id"],
            name=op.f("fk_media_collection_member_asset_id_media_asset"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["collection_id"],
            ["media_collection.id"],
            name=op.f("fk_media_collection_member_collection_id_media_collection"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_media_collection_member")),
        sa.UniqueConstraint(
            "collection_id",
            "asset_id",
            name="uq_media_collection_member_collection_asset",
        ),
    )
    op.create_index(
        op.f("ix_media_collection_member_collection_id"),
        "media_collection_member",
        ["collection_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_media_collection_member_asset_id"),
        "media_collection_member",
        ["asset_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_media_collection_member_asset_id"),
        table_name="media_collection_member",
    )
    op.drop_index(
        op.f("ix_media_collection_member_collection_id"),
        table_name="media_collection_member",
    )
    op.drop_table("media_collection_member")
    op.drop_index(
        op.f("ix_media_collection_created_by_clerk_user_id"),
        table_name="media_collection",
    )
    op.drop_index(op.f("ix_media_collection_workspace_id"), table_name="media_collection")
    op.drop_table("media_collection")
    op.drop_index(op.f("ix_media_asset_created_by_clerk_user_id"), table_name="media_asset")
    op.drop_index(op.f("ix_media_asset_workspace_id"), table_name="media_asset")
    op.drop_table("media_asset")
