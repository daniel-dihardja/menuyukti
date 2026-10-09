"""Make voting.closes_at nullable (manual close only)

Revision ID: p9q0r1s2t3u4
Revises: o8p9q0r1s2t3
Create Date: 2026-10-09

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "p9q0r1s2t3u4"
down_revision: str | Sequence[str] | None = "o8p9q0r1s2t3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column(
        "voting",
        "closes_at",
        existing_type=sa.DateTime(timezone=True),
        nullable=True,
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            "UPDATE voting SET closes_at = COALESCE(closes_at, now() + interval '1 day') "
            "WHERE closes_at IS NULL"
        )
    )
    op.alter_column(
        "voting",
        "closes_at",
        existing_type=sa.DateTime(timezone=True),
        nullable=False,
    )
