"""location_advisor_memory: durable advisor-written notes per location

Revision ID: h2i3j4k5l6m7
Revises: g6h7i8j9k0l1
Create Date: 2026-10-29

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "h2i3j4k5l6m7"
down_revision: str | Sequence[str] | None = "g6h7i8j9k0l1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "location_advisor_memory",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("location_id", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["location_id"],
            ["location.id"],
            name=op.f("fk_location_advisor_memory_location_id_location"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_location_advisor_memory")),
        sa.UniqueConstraint("location_id", name=op.f("uq_location_advisor_memory_location_id")),
    )
    op.create_index(
        op.f("ix_location_advisor_memory_location_id"),
        "location_advisor_memory",
        ["location_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_location_advisor_memory_location_id"),
        table_name="location_advisor_memory",
    )
    op.drop_table("location_advisor_memory")
