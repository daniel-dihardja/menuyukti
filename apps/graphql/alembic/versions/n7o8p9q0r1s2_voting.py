"""voting, voting_outcome, voting_vote tables

Revision ID: n7o8p9q0r1s2
Revises: m6n7o8p9q0r1
Create Date: 2026-10-09

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "n7o8p9q0r1s2"
down_revision: str | Sequence[str] | None = "m6n7o8p9q0r1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "voting",
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
            name=op.f("fk_voting_location_id_location"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_voting")),
    )
    op.create_index(
        op.f("ix_voting_location_id"),
        "voting",
        ["location_id"],
        unique=False,
    )
    op.create_index(
        "ix_voting_location_status",
        "voting",
        ["location_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_voting_location_closes_at",
        "voting",
        ["location_id", "closes_at"],
        unique=False,
    )

    op.create_table(
        "voting_outcome",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("voting_id", sa.Integer(), nullable=False),
        sa.Column("label", sa.String(length=256), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
        sa.ForeignKeyConstraint(
            ["voting_id"],
            ["voting.id"],
            name=op.f("fk_voting_outcome_voting_id_voting"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_voting_outcome")),
    )
    op.create_index(
        op.f("ix_voting_outcome_voting_id"),
        "voting_outcome",
        ["voting_id"],
        unique=False,
    )

    op.create_foreign_key(
        "fk_voting_winning_outcome_id",
        "voting",
        "voting_outcome",
        ["winning_outcome_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_table(
        "voting_vote",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("voting_id", sa.Integer(), nullable=False),
        sa.Column("clerk_user_id", sa.String(length=128), nullable=False),
        sa.Column("outcome_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["voting_id"],
            ["voting.id"],
            name=op.f("fk_voting_vote_voting_id_voting"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["outcome_id"],
            ["voting_outcome.id"],
            name=op.f("fk_voting_vote_outcome_id_voting_outcome"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_voting_vote")),
        sa.UniqueConstraint(
            "voting_id",
            "clerk_user_id",
            name="uq_voting_vote_voting_clerk_user",
        ),
    )
    op.create_index(
        op.f("ix_voting_vote_voting_id"),
        "voting_vote",
        ["voting_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_voting_vote_outcome_id"),
        "voting_vote",
        ["outcome_id"],
        unique=False,
    )
    op.create_index(
        "ix_voting_vote_clerk_user_id",
        "voting_vote",
        ["clerk_user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_voting_vote_clerk_user_id", table_name="voting_vote")
    op.drop_index(op.f("ix_voting_vote_outcome_id"), table_name="voting_vote")
    op.drop_index(op.f("ix_voting_vote_voting_id"), table_name="voting_vote")
    op.drop_table("voting_vote")

    op.drop_constraint("fk_voting_winning_outcome_id", "voting", type_="foreignkey")

    op.drop_index(
        op.f("ix_voting_outcome_voting_id"),
        table_name="voting_outcome",
    )
    op.drop_table("voting_outcome")

    op.drop_index("ix_voting_location_closes_at", table_name="voting")
    op.drop_index("ix_voting_location_status", table_name="voting")
    op.drop_index(op.f("ix_voting_location_id"), table_name="voting")
    op.drop_table("voting")
