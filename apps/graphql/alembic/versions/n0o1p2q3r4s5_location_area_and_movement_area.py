"""location_area table and inventory_stock_movement.location_area_id

Revision ID: n0o1p2q3r4s5
Revises: j6k7l8m9n0o1
Create Date: 2026-09-08

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "n0o1p2q3r4s5"
down_revision: str | Sequence[str] | None = "j6k7l8m9n0o1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "location_area",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("location_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(
            ["location_id"],
            ["location.id"],
            name=op.f("fk_location_area_location_id_location"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_location_area")),
        sa.UniqueConstraint(
            "location_id",
            "name",
            name="uq_location_area_location_name",
        ),
    )
    op.create_index(
        op.f("ix_location_area_location_id"),
        "location_area",
        ["location_id"],
        unique=False,
    )

    op.add_column(
        "inventory_stock_movement",
        sa.Column("location_area_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        op.f("fk_inventory_stock_movement_location_area_id_location_area"),
        "inventory_stock_movement",
        "location_area",
        ["location_area_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        op.f("ix_inventory_stock_movement_location_area_id"),
        "inventory_stock_movement",
        ["location_area_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_inventory_stock_movement_location_area_id"),
        table_name="inventory_stock_movement",
    )
    op.drop_constraint(
        op.f("fk_inventory_stock_movement_location_area_id_location_area"),
        "inventory_stock_movement",
        type_="foreignkey",
    )
    op.drop_column("inventory_stock_movement", "location_area_id")

    op.drop_index(op.f("ix_location_area_location_id"), table_name="location_area")
    op.drop_table("location_area")
