"""location_frontpage: favorite_images and combo_images JSON overrides

Revision ID: x0y1z2a3b4c5
Revises: w9x0y1z2a3b4
Create Date: 2026-09-14

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "x0y1z2a3b4c5"
down_revision: str | Sequence[str] | None = "w9x0y1z2a3b4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_jsonb = postgresql.JSONB(astext_type=sa.Text()).with_variant(sa.JSON(), "sqlite")


def upgrade() -> None:
    op.add_column(
        "location_frontpage",
        sa.Column(
            "favorite_images",
            _jsonb,
            nullable=False,
            server_default=sa.text("'[]'"),
        ),
    )
    op.add_column(
        "location_frontpage",
        sa.Column(
            "combo_images",
            _jsonb,
            nullable=False,
            server_default=sa.text("'[]'"),
        ),
    )


def downgrade() -> None:
    op.drop_column("location_frontpage", "combo_images")
    op.drop_column("location_frontpage", "favorite_images")
