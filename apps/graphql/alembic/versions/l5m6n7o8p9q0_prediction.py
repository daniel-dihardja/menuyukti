"""prediction, prediction_outcome, prediction_vote tables

Revision ID: l5m6n7o8p9q0
Revises: k4l5m6n7o8p9
Create Date: 2026-10-08

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "l5m6n7o8p9q0"
down_revision: str | Sequence[str] | None = "k4l5m6n7o8p9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "prediction",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("location_id", sa.Integer(), nullable=False),
        sa.Column("question", sa.String(length=512), nullable=False),
        sa.Column(
            "status",
            sa.String(length=32),
            server_default=sa.text("'open'"),
            nullable=False,
        ),
        sa.Column("closes_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "reward_mode",
            sa.String(length=32),
            server_default=sa.text("'social'"),
            nullable=False,
        ),
        sa.Column(
            "points_for_vote",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),
        sa.Column(
            "points_for_correct",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),
        sa.Column("winning_outcome_id", sa.Integer(), nullable=True),
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
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["location_id"],
            ["location.id"],
            name=op.f("fk_prediction_location_id_location"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_prediction")),
    )
    op.create_index(
        op.f("ix_prediction_location_id"),
        "prediction",
        ["location_id"],
        unique=False,
    )
    op.create_index(
        "ix_prediction_location_status",
        "prediction",
        ["location_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_prediction_location_closes_at",
        "prediction",
        ["location_id", "closes_at"],
        unique=False,
    )

    op.create_table(
        "prediction_outcome",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("prediction_id", sa.Integer(), nullable=False),
        sa.Column("label", sa.String(length=256), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.ForeignKeyConstraint(
            ["prediction_id"],
            ["prediction.id"],
            name=op.f("fk_prediction_outcome_prediction_id_prediction"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_prediction_outcome")),
    )
    op.create_index(
        op.f("ix_prediction_outcome_prediction_id"),
        "prediction_outcome",
        ["prediction_id"],
        unique=False,
    )

    op.create_foreign_key(
        "fk_prediction_winning_outcome_id",
        "prediction",
        "prediction_outcome",
        ["winning_outcome_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_table(
        "prediction_vote",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("prediction_id", sa.Integer(), nullable=False),
        sa.Column("clerk_user_id", sa.String(length=128), nullable=False),
        sa.Column("outcome_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["prediction_id"],
            ["prediction.id"],
            name=op.f("fk_prediction_vote_prediction_id_prediction"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["outcome_id"],
            ["prediction_outcome.id"],
            name=op.f("fk_prediction_vote_outcome_id_prediction_outcome"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_prediction_vote")),
        sa.UniqueConstraint(
            "prediction_id",
            "clerk_user_id",
            name="uq_prediction_vote_prediction_clerk_user",
        ),
    )
    op.create_index(
        op.f("ix_prediction_vote_prediction_id"),
        "prediction_vote",
        ["prediction_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_prediction_vote_outcome_id"),
        "prediction_vote",
        ["outcome_id"],
        unique=False,
    )
    op.create_index(
        "ix_prediction_vote_clerk_user_id",
        "prediction_vote",
        ["clerk_user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_prediction_vote_clerk_user_id", table_name="prediction_vote")
    op.drop_index(op.f("ix_prediction_vote_outcome_id"), table_name="prediction_vote")
    op.drop_index(op.f("ix_prediction_vote_prediction_id"), table_name="prediction_vote")
    op.drop_table("prediction_vote")

    op.drop_constraint("fk_prediction_winning_outcome_id", "prediction", type_="foreignkey")

    op.drop_index(
        op.f("ix_prediction_outcome_prediction_id"),
        table_name="prediction_outcome",
    )
    op.drop_table("prediction_outcome")

    op.drop_index("ix_prediction_location_closes_at", table_name="prediction")
    op.drop_index("ix_prediction_location_status", table_name="prediction")
    op.drop_index(op.f("ix_prediction_location_id"), table_name="prediction")
    op.drop_table("prediction")
