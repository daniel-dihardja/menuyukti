"""drop milestone/workflow leftover table and columns

Revision ID: t6u7v8w9x0y1
Revises: s4t5u6v7w8x9
Create Date: 2026-07-30

Deletes orphan campaign node rows and milestone_agent_run, then drops
milestone_agent_run, node milestone_* columns, and calendar_entry.source_ref.
Does not drop the generic node table.
"""

from collections.abc import Sequence

from alembic import op

revision: str = "t6u7v8w9x0y1"
down_revision: str | Sequence[str] | None = "s4t5u6v7w8x9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_DEPRECATED_NODE_TYPES = (
    "workflow",
    "milestone",
    "milestonedata",
    "result",
    "passcriteria",
    "goal",
)


def upgrade() -> None:
    # Clear FK references before deleting campaign nodes.
    op.execute("DELETE FROM milestone_agent_run")

    # Delete deprecated campaign trees (roots + any descendants under them).
    types_sql = ", ".join(f"'{t}'" for t in _DEPRECATED_NODE_TYPES)
    op.execute(
        f"""
        WITH RECURSIVE doomed AS (
            SELECT id
            FROM node
            WHERE type IN ({types_sql})
            UNION ALL
            SELECT n.id
            FROM node AS n
            INNER JOIN doomed AS d ON n.parent_id = d.id
        )
        DELETE FROM node
        WHERE id IN (SELECT id FROM doomed)
        """
    )

    op.drop_table("milestone_agent_run")

    op.drop_column("node", "milestone_goal")
    op.drop_column("node", "milestone_input")
    op.drop_column("node", "pass_criterias")
    op.drop_column("node", "milestone_preset_data")
    op.drop_column("node", "milestone_result")

    op.drop_column("calendar_entry", "source_ref")


def downgrade() -> None:
    # Data wipe + structural drops; recreate via historical migrations if needed.
    raise NotImplementedError(
        "Cannot downgrade drop of milestone_agent_run / node milestone columns / source_ref"
    )
