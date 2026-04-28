"""location_opening_hour table

Revision ID: e7f8a9b0c1d2
Revises: f1e2d3c4b5a6
Create Date: 2026-04-28

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "e7f8a9b0c1d2"
down_revision: str | Sequence[str] | None = "f1e2d3c4b5a6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "location_opening_hour",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("location_id", sa.Integer(), nullable=False),
        sa.Column("day_of_week", sa.String(length=16), nullable=False),
        sa.Column("open_time", sa.Time(), nullable=False),
        sa.Column("close_time", sa.Time(), nullable=False),
        sa.ForeignKeyConstraint(
            ["location_id"],
            ["location.id"],
            name=op.f("fk_location_opening_hour_location_id_location"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_location_opening_hour")),
        sa.UniqueConstraint(
            "location_id",
            "day_of_week",
            name="uq_location_opening_hour_location_day",
        ),
    )
    op.create_index(
        op.f("ix_location_opening_hour_location_id"),
        "location_opening_hour",
        ["location_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_location_opening_hour_location_id"), table_name="location_opening_hour")
    op.drop_table("location_opening_hour")
