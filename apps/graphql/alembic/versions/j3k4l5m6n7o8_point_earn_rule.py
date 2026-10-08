"""point_earn_rule: per-location earn action configuration

Revision ID: j3k4l5m6n7o8
Revises: i2j3k4l5m6n7
Create Date: 2026-10-07

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "j3k4l5m6n7o8"
down_revision: str | Sequence[str] | None = "i2j3k4l5m6n7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "point_earn_rule",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("location_id", sa.Integer(), nullable=False),
        sa.Column("action_key", sa.String(length=64), nullable=False),
        sa.Column("points", sa.Integer(), server_default="0", nullable=False),
        sa.Column("enabled", sa.Boolean(), server_default=sa.text("false"), nullable=False),
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
            name=op.f("fk_point_earn_rule_location_id_location"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_point_earn_rule")),
        sa.UniqueConstraint(
            "location_id",
            "action_key",
            name="uq_point_earn_rule_location_action",
        ),
    )
    op.create_index(
        op.f("ix_point_earn_rule_location_id"),
        "point_earn_rule",
        ["location_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_point_earn_rule_location_id"), table_name="point_earn_rule")
    op.drop_table("point_earn_rule")
