"""instagram_posts: workspace scope, optional location, title, creator.

Revision ID: s8t9u0v1w2x3
Revises: r7s8t9u0v1w2
Create Date: 2026-07-07

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "s8t9u0v1w2x3"
down_revision: str | Sequence[str] | None = "r7s8t9u0v1w2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("instagram_posts", sa.Column("workspace_id", sa.Integer(), nullable=True))
    op.add_column("instagram_posts", sa.Column("title", sa.String(length=256), nullable=True))
    op.add_column(
        "instagram_posts",
        sa.Column("created_by_clerk_user_id", sa.String(length=128), nullable=True),
    )
    op.alter_column("instagram_posts", "location_id", existing_type=sa.Integer(), nullable=True)
    op.create_foreign_key(
        op.f("fk_instagram_posts_workspace_id_workspace"),
        "instagram_posts",
        "workspace",
        ["workspace_id"],
        ["id"],
    )
    op.create_index(
        op.f("ix_instagram_posts_workspace_id"),
        "instagram_posts",
        ["workspace_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_instagram_posts_created_by_clerk_user_id"),
        "instagram_posts",
        ["created_by_clerk_user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_instagram_posts_created_by_clerk_user_id"),
        table_name="instagram_posts",
    )
    op.drop_index(op.f("ix_instagram_posts_workspace_id"), table_name="instagram_posts")
    op.drop_constraint(
        op.f("fk_instagram_posts_workspace_id_workspace"),
        "instagram_posts",
        type_="foreignkey",
    )
    op.alter_column("instagram_posts", "location_id", existing_type=sa.Integer(), nullable=False)
    op.drop_column("instagram_posts", "created_by_clerk_user_id")
    op.drop_column("instagram_posts", "title")
    op.drop_column("instagram_posts", "workspace_id")
