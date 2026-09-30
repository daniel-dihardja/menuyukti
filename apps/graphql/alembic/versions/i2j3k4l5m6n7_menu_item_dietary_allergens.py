"""menu_item dietary_tags and allergens JSON columns

Revision ID: i2j3k4l5m6n7
Revises: g0h1i2j3k4l5
Create Date: 2026-09-30

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "i2j3k4l5m6n7"
down_revision: str | Sequence[str] | None = "g0h1i2j3k4l5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_jsonb = postgresql.JSONB(astext_type=sa.Text()).with_variant(sa.JSON(), "sqlite")


def upgrade() -> None:
    op.add_column(
        "menu_item",
        sa.Column(
            "dietary_tags",
            _jsonb,
            nullable=False,
            server_default=sa.text("'[]'"),
        ),
    )
    op.add_column(
        "menu_item",
        sa.Column(
            "allergens",
            _jsonb,
            nullable=False,
            server_default=sa.text("'[]'"),
        ),
    )


def downgrade() -> None:
    op.drop_column("menu_item", "allergens")
    op.drop_column("menu_item", "dietary_tags")
