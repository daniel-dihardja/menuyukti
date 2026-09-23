"""menu.public_enabled for public digital menu frontpage

Revision ID: d6e7f8a9b0c1
Revises: c5d6e7f8a9b0
Create Date: 2026-09-23

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "d6e7f8a9b0c1"
down_revision: str | Sequence[str] | None = "c5d6e7f8a9b0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "menu",
        sa.Column(
            "public_enabled",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
    )
    # Locations that already published a guest wall keep a live public URL.
    op.execute(
        """
        UPDATE menu AS m
        SET public_enabled = true
        FROM location_frontpage AS fp
        WHERE fp.location_id = m.location_id
          AND fp.wall_enabled IS TRUE
        """
    )


def downgrade() -> None:
    op.drop_column("menu", "public_enabled")
