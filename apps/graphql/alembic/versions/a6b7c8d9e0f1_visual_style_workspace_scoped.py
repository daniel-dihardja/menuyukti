"""visual_style: workspace-scoped style packs (migrate from location_style)

Revision ID: a6b7c8d9e0f1
Revises: z5a6b7c8d9e0
Create Date: 2026-07-20

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "a6b7c8d9e0f1"
down_revision: str | Sequence[str] | None = "z5a6b7c8d9e0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("location_style", sa.Column("workspace_id", sa.Integer(), nullable=True))
    op.add_column(
        "location_style",
        sa.Column("created_by_clerk_user_id", sa.String(length=128), nullable=True),
    )

    op.execute(
        """
        UPDATE location_style AS ls
        SET
            workspace_id = COALESCE(
                loc.workspace_id,
                (
                    SELECT wm.workspace_id
                    FROM workspace_membership AS wm
                    WHERE wm.clerk_user_id = loc.clerk_user_id
                    ORDER BY wm.workspace_id
                    LIMIT 1
                ),
                (
                    SELECT w.id
                    FROM workspace AS w
                    WHERE w.owner_clerk_user_id = loc.clerk_user_id
                    ORDER BY w.id
                    LIMIT 1
                )
            ),
            created_by_clerk_user_id = COALESCE(
                loc.clerk_user_id,
                (
                    SELECT w.owner_clerk_user_id
                    FROM workspace AS w
                    WHERE w.id = loc.workspace_id
                )
            )
        FROM location AS loc
        WHERE loc.id = ls.location_id
        """
    )

    op.execute("DELETE FROM location_style WHERE workspace_id IS NULL")
    op.execute(
        """
        UPDATE location_style
        SET created_by_clerk_user_id = (
            SELECT w.owner_clerk_user_id
            FROM workspace AS w
            WHERE w.id = location_style.workspace_id
        )
        WHERE created_by_clerk_user_id IS NULL
        """
    )
    op.execute("DELETE FROM location_style WHERE created_by_clerk_user_id IS NULL")

    op.alter_column("location_style", "workspace_id", existing_type=sa.Integer(), nullable=False)
    op.alter_column(
        "location_style",
        "created_by_clerk_user_id",
        existing_type=sa.String(length=128),
        nullable=False,
    )

    op.drop_index(op.f("ix_location_style_location_id"), table_name="location_style")
    op.drop_constraint(
        op.f("fk_location_style_location_id_location"),
        "location_style",
        type_="foreignkey",
    )
    op.drop_column("location_style", "location_id")

    op.create_foreign_key(
        op.f("fk_location_style_workspace_id_workspace"),
        "location_style",
        "workspace",
        ["workspace_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index(
        op.f("ix_location_style_workspace_id"),
        "location_style",
        ["workspace_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_location_style_created_by_clerk_user_id"),
        "location_style",
        ["created_by_clerk_user_id"],
        unique=False,
    )

    op.rename_table("location_style", "visual_style")
    op.execute("ALTER INDEX ix_location_style_workspace_id RENAME TO ix_visual_style_workspace_id")
    op.execute(
        "ALTER INDEX ix_location_style_created_by_clerk_user_id "
        "RENAME TO ix_visual_style_created_by_clerk_user_id"
    )
    op.execute(
        "ALTER TABLE visual_style RENAME CONSTRAINT fk_location_style_workspace_id_workspace "
        "TO fk_visual_style_workspace_id_workspace"
    )
    op.execute("ALTER TABLE visual_style RENAME CONSTRAINT pk_location_style TO pk_visual_style")


def downgrade() -> None:
    op.execute("ALTER TABLE visual_style RENAME CONSTRAINT pk_visual_style TO pk_location_style")
    op.execute(
        "ALTER TABLE visual_style RENAME CONSTRAINT fk_visual_style_workspace_id_workspace "
        "TO fk_location_style_workspace_id_workspace"
    )
    op.execute(
        "ALTER INDEX ix_visual_style_created_by_clerk_user_id "
        "RENAME TO ix_location_style_created_by_clerk_user_id"
    )
    op.execute("ALTER INDEX ix_visual_style_workspace_id RENAME TO ix_location_style_workspace_id")
    op.rename_table("visual_style", "location_style")

    op.add_column("location_style", sa.Column("location_id", sa.Integer(), nullable=True))

    op.execute(
        """
        UPDATE location_style AS ls
        SET location_id = (
            SELECT loc.id
            FROM location AS loc
            WHERE loc.workspace_id = ls.workspace_id
            ORDER BY loc.id
            LIMIT 1
        )
        """
    )
    op.execute("DELETE FROM location_style WHERE location_id IS NULL")
    op.alter_column("location_style", "location_id", existing_type=sa.Integer(), nullable=False)

    op.drop_index(op.f("ix_location_style_created_by_clerk_user_id"), table_name="location_style")
    op.drop_index(op.f("ix_location_style_workspace_id"), table_name="location_style")
    op.drop_constraint(
        op.f("fk_location_style_workspace_id_workspace"),
        "location_style",
        type_="foreignkey",
    )
    op.drop_column("location_style", "created_by_clerk_user_id")
    op.drop_column("location_style", "workspace_id")

    op.create_foreign_key(
        op.f("fk_location_style_location_id_location"),
        "location_style",
        "location",
        ["location_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index(
        op.f("ix_location_style_location_id"),
        "location_style",
        ["location_id"],
        unique=False,
    )
