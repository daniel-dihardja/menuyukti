"""location.listing_kind for commercial vs community listings

Revision ID: c2d3e4f5a6b7
Revises: b1c2d3e4f5a6
Create Date: 2026-10-20

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "c2d3e4f5a6b7"
down_revision: str | Sequence[str] | None = "b1c2d3e4f5a6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "location",
        sa.Column(
            "listing_kind",
            sa.String(length=32),
            nullable=False,
            server_default="commercial",
        ),
    )


def downgrade() -> None:
    op.drop_column("location", "listing_kind")
