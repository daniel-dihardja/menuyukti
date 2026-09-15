"""location.public_slug and location_frontpage.wall_enabled

Revision ID: y1z2a3b4c5d6
Revises: x0y1z2a3b4c5
Create Date: 2026-09-14

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "y1z2a3b4c5d6"
down_revision: str | Sequence[str] | None = "x0y1z2a3b4c5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "location",
        sa.Column("public_slug", sa.String(length=128), nullable=True),
    )
    op.create_index(
        "ix_location_public_slug",
        "location",
        ["public_slug"],
        unique=True,
    )
    op.add_column(
        "location_frontpage",
        sa.Column(
            "wall_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )


def downgrade() -> None:
    op.drop_column("location_frontpage", "wall_enabled")
    op.drop_index("ix_location_public_slug", table_name="location")
    op.drop_column("location", "public_slug")
