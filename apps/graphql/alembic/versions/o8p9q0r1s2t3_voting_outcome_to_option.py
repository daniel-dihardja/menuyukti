"""Rename voting outcome → option (table and columns)

Revision ID: o8p9q0r1s2t3
Revises: n7o8p9q0r1s2
Create Date: 2026-10-09

"""

from collections.abc import Sequence

from alembic import op

revision: str = "o8p9q0r1s2t3"
down_revision: str | Sequence[str] | None = "n7o8p9q0r1s2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint("fk_voting_winning_outcome_id", "voting", type_="foreignkey")
    op.drop_constraint(
        op.f("fk_voting_vote_outcome_id_voting_outcome"),
        "voting_vote",
        type_="foreignkey",
    )

    op.rename_table("voting_outcome", "voting_option")

    op.alter_column("voting", "winning_outcome_id", new_column_name="winning_option_id")
    op.alter_column("voting_vote", "outcome_id", new_column_name="option_id")

    op.execute(
        "ALTER INDEX IF EXISTS ix_voting_outcome_voting_id RENAME TO ix_voting_option_voting_id"
    )
    op.execute("ALTER INDEX IF EXISTS ix_voting_vote_outcome_id RENAME TO ix_voting_vote_option_id")

    op.create_foreign_key(
        "fk_voting_winning_option_id",
        "voting",
        "voting_option",
        ["winning_option_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        op.f("fk_voting_vote_option_id_voting_option"),
        "voting_vote",
        "voting_option",
        ["option_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    op.drop_constraint("fk_voting_winning_option_id", "voting", type_="foreignkey")
    op.drop_constraint(
        op.f("fk_voting_vote_option_id_voting_option"),
        "voting_vote",
        type_="foreignkey",
    )

    op.execute("ALTER INDEX IF EXISTS ix_voting_vote_option_id RENAME TO ix_voting_vote_outcome_id")
    op.execute(
        "ALTER INDEX IF EXISTS ix_voting_option_voting_id RENAME TO ix_voting_outcome_voting_id"
    )

    op.alter_column("voting_vote", "option_id", new_column_name="outcome_id")
    op.alter_column("voting", "winning_option_id", new_column_name="winning_outcome_id")

    op.rename_table("voting_option", "voting_outcome")

    op.create_foreign_key(
        "fk_voting_winning_outcome_id",
        "voting",
        "voting_outcome",
        ["winning_outcome_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        op.f("fk_voting_vote_outcome_id_voting_outcome"),
        "voting_vote",
        "voting_outcome",
        ["outcome_id"],
        ["id"],
        ondelete="CASCADE",
    )
