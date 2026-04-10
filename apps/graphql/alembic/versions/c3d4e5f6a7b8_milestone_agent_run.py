"""milestone_agent_run table

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-04-10

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "c3d4e5f6a7b8"
down_revision: str | Sequence[str] | None = "b2c3d4e5f6a7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "milestone_agent_run",
        sa.Column("run_id", sa.Text(), nullable=False),
        sa.Column("milestone_node_id", sa.Integer(), nullable=False),
        sa.Column("workflow_root_id", sa.Integer(), nullable=True),
        sa.Column("location_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Text(), nullable=False),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "status",
            sa.Text(),
            server_default=sa.text("'running'"),
            nullable=False,
        ),
        sa.Column("external_trace_id", sa.Text(), nullable=True),
        sa.Column("external_trace_url", sa.Text(), nullable=True),
        sa.Column(
            "summary",
            postgresql.JSONB(astext_type=sa.Text()).with_variant(sa.JSON(), "sqlite"),
            nullable=True,
        ),
        sa.Column(
            "timeline",
            postgresql.JSONB(astext_type=sa.Text()).with_variant(sa.JSON(), "sqlite"),
            nullable=True,
        ),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(
            ["location_id"],
            ["location.id"],
        ),
        sa.ForeignKeyConstraint(
            ["milestone_node_id"],
            ["node.id"],
        ),
        sa.ForeignKeyConstraint(
            ["workflow_root_id"],
            ["node.id"],
        ),
        sa.PrimaryKeyConstraint("run_id"),
    )
    op.create_index(
        "ix_milestone_agent_run_location_id",
        "milestone_agent_run",
        ["location_id"],
        unique=False,
    )
    op.create_index(
        "ix_milestone_agent_run_milestone_node_id",
        "milestone_agent_run",
        ["milestone_node_id"],
        unique=False,
    )
    op.create_index(
        "ix_milestone_agent_run_user_id",
        "milestone_agent_run",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_milestone_agent_run_user_id", table_name="milestone_agent_run")
    op.drop_index("ix_milestone_agent_run_milestone_node_id", table_name="milestone_agent_run")
    op.drop_index("ix_milestone_agent_run_location_id", table_name="milestone_agent_run")
    op.drop_table("milestone_agent_run")
