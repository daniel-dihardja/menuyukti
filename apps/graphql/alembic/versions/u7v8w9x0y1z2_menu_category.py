"""menu_category + menu_item.category_id for curated menu sections

Revision ID: u7v8w9x0y1z2
Revises: s5t6u7v8w9x0
Create Date: 2026-09-13

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy import text

from alembic import op

revision: str = "u7v8w9x0y1z2"
down_revision: str | Sequence[str] | None = "s5t6u7v8w9x0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "menu_category",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("menu_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=256), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
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
            ["menu_id"],
            ["menu.id"],
            name=op.f("fk_menu_category_menu_id_menu"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_menu_category")),
    )
    op.create_index(op.f("ix_menu_category_menu_id"), "menu_category", ["menu_id"], unique=False)

    op.add_column(
        "menu_item",
        sa.Column("category_id", sa.Integer(), nullable=True),
    )

    conn = op.get_bind()
    menu_ids = conn.execute(
        text(
            """
            SELECT DISTINCT menu_id
            FROM menu_item
            WHERE category_id IS NULL
            """
        )
    ).fetchall()
    for (menu_id,) in menu_ids:
        category_id = conn.execute(
            text(
                """
                INSERT INTO menu_category (menu_id, name, sort_order)
                VALUES (:menu_id, 'Uncategorized', 0)
                RETURNING id
                """
            ),
            {"menu_id": menu_id},
        ).scalar_one()
        conn.execute(
            text(
                """
                UPDATE menu_item
                SET category_id = :category_id
                WHERE menu_id = :menu_id AND category_id IS NULL
                """
            ),
            {"category_id": category_id, "menu_id": menu_id},
        )

    op.alter_column("menu_item", "category_id", existing_type=sa.Integer(), nullable=False)
    op.create_foreign_key(
        op.f("fk_menu_item_category_id_menu_category"),
        "menu_item",
        "menu_category",
        ["category_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index(op.f("ix_menu_item_category_id"), "menu_item", ["category_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_menu_item_category_id"), table_name="menu_item")
    op.drop_constraint(
        op.f("fk_menu_item_category_id_menu_category"),
        "menu_item",
        type_="foreignkey",
    )
    op.drop_column("menu_item", "category_id")
    op.drop_index(op.f("ix_menu_category_menu_id"), table_name="menu_category")
    op.drop_table("menu_category")
