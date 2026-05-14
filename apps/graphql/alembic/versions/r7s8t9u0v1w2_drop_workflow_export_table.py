"""Drop persisted workflow export snapshots (`workflow` table)."""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "r7s8t9u0v1w2"
down_revision: str | Sequence[str] | None = "945ee08c9318"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_index(op.f("ix_workflow_workflow_id"), table_name="workflow")
    op.drop_index(op.f("ix_workflow_location_id"), table_name="workflow")
    op.drop_table("workflow")


def downgrade() -> None:
    import sqlalchemy as sa

    op.create_table(
        "workflow",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("workflow_id", sa.Integer(), nullable=False),
        sa.Column("location_id", sa.Integer(), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("schema_version", sa.Text(), server_default=sa.text("'2.0'"), nullable=False),
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
        sa.ForeignKeyConstraint(["location_id"], ["location.id"]),
        sa.ForeignKeyConstraint(["workflow_id"], ["node.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_workflow_location_id"), "workflow", ["location_id"], unique=False)
    op.create_index(op.f("ix_workflow_workflow_id"), "workflow", ["workflow_id"], unique=True)
