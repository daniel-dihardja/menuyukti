"""timestamp_columns_not_null

Align timestamp columns with ORM: NOT NULL with server default now().

Revision ID: d33dbb3268a7
Revises: a1b2c3d4e5f6
Create Date: 2026-04-09 13:41:53.462549

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy import text

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d33dbb3268a7"
down_revision: str | Sequence[str] | None = "a1b2c3d4e5f6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_TS = sa.DateTime(timezone=True)
_SERVER_DEFAULT = sa.text("now()")

# (table, column) — initial_schema had nullable=True; models expect NOT NULL.
_TIMESTAMP_COLUMNS: list[tuple[str, str]] = [
    ("analytics_run", "created_at"),
    ("image_ai_flow", "created_at"),
    ("image_ai_flow", "updated_at"),
    ("instagram_posts", "created_at"),
    ("instagram_posts", "updated_at"),
    ("menu_item_cogs", "created_at"),
    ("menu_item_cogs", "updated_at"),
    ("node", "created_at"),
    ("node", "updated_at"),
    ("workflow", "created_at"),
    ("workflow", "updated_at"),
    ("workspace", "created_at"),
    ("workspace", "updated_at"),
    ("workspace_membership", "invited_at"),
]


def upgrade() -> None:
    for table, column in _TIMESTAMP_COLUMNS:
        op.execute(text(f"UPDATE {table} SET {column} = now() WHERE {column} IS NULL"))
        op.alter_column(
            table,
            column,
            existing_type=_TS,
            existing_server_default=_SERVER_DEFAULT,
            existing_nullable=True,
            nullable=False,
        )


def downgrade() -> None:
    for table, column in reversed(_TIMESTAMP_COLUMNS):
        op.alter_column(
            table,
            column,
            existing_type=_TS,
            existing_server_default=_SERVER_DEFAULT,
            existing_nullable=False,
            nullable=True,
        )
