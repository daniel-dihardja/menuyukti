"""location_manual_brief_input: owner click-first brief hints (separate from AI social settings).

Revision ID: f8a9b0c1d2e3
Revises: e7f8a9b0c1d2
Create Date: 2026-04-28

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "f8a9b0c1d2e3"
down_revision: str | Sequence[str] | None = "e7f8a9b0c1d2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "location_manual_brief_input",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("location_id", sa.Integer(), nullable=False),
        sa.Column(
            "quick_profile",
            postgresql.JSONB(astext_type=sa.Text()).with_variant(sa.JSON(), "sqlite"),
            nullable=True,
        ),
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
            name=op.f("fk_location_manual_brief_input_location_id_location"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_location_manual_brief_input")),
        sa.UniqueConstraint("location_id", name=op.f("uq_location_manual_brief_input_location_id")),
    )
    op.create_index(
        op.f("ix_location_manual_brief_input_location_id"),
        "location_manual_brief_input",
        ["location_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_location_manual_brief_input_location_id"),
        table_name="location_manual_brief_input",
    )
    op.drop_table("location_manual_brief_input")
