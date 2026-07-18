"""calendar_entry: drop Instagram format kind (global events)

Revision ID: y4z5a6b7c8d9
Revises: x3y4z5a6b7c8
Create Date: 2026-07-18

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "y4z5a6b7c8d9"
down_revision: str | Sequence[str] | None = "x3y4z5a6b7c8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_column("calendar_entry", "kind")


def downgrade() -> None:
    op.add_column(
        "calendar_entry",
        sa.Column("kind", sa.String(length=16), nullable=False, server_default="post"),
    )
    op.alter_column("calendar_entry", "kind", server_default=None)
