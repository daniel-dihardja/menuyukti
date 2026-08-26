"""inventory_catalog_item and inventory_stock for relaxed inventar

Revision ID: c9d0e1f2a3b4
Revises: b8c9d0e1f2a3
Create Date: 2026-08-26

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "c9d0e1f2a3b4"
down_revision: str | Sequence[str] | None = "b8c9d0e1f2a3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "inventory_catalog_item",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("workspace_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=256), nullable=False),
        sa.Column("package_size", sa.Float(), nullable=False),
        sa.Column("package_unit", sa.String(length=32), nullable=False),
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
            name=op.f("fk_inventory_catalog_item_workspace_id_workspace"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_inventory_catalog_item")),
        sa.UniqueConstraint(
            "workspace_id",
            "name",
            "package_size",
            "package_unit",
            name="uq_inventory_catalog_item_workspace_pack",
        ),
    )
    op.create_index(
        op.f("ix_inventory_catalog_item_workspace_id"),
        "inventory_catalog_item",
        ["workspace_id"],
        unique=False,
    )

    op.create_table(
        "inventory_stock",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("location_id", sa.Integer(), nullable=False),
        sa.Column("catalog_item_id", sa.Integer(), nullable=False),
        sa.Column("on_hand", sa.Float(), nullable=False),
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
            ["catalog_item_id"],
            ["inventory_catalog_item.id"],
            name=op.f("fk_inventory_stock_catalog_item_id_inventory_catalog_item"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["location_id"],
            ["location.id"],
            name=op.f("fk_inventory_stock_location_id_location"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_inventory_stock")),
        sa.UniqueConstraint(
            "location_id",
            "catalog_item_id",
            name="uq_inventory_stock_location_catalog",
        ),
    )
    op.create_index(
        op.f("ix_inventory_stock_location_id"),
        "inventory_stock",
        ["location_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_inventory_stock_location_id"), table_name="inventory_stock")
    op.drop_table("inventory_stock")
    op.drop_index(
        op.f("ix_inventory_catalog_item_workspace_id"),
        table_name="inventory_catalog_item",
    )
    op.drop_table("inventory_catalog_item")
