"""drop location.listing_kind (community vs commercial)

Revision ID: e4f5a6b7c8d9
Revises: d3e4f5a6b7c8
Create Date: 2026-10-21

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "e4f5a6b7c8d9"
down_revision: str | Sequence[str] | None = "d3e4f5a6b7c8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_column("location", "listing_kind")


def downgrade() -> None:
    op.add_column(
        "location",
        sa.Column(
            "listing_kind",
            sa.String(length=32),
            nullable=False,
            server_default="commercial",
        ),
    )
