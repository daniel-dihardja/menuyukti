"""api_adapter_tool table

Revision ID: f1e2d3c4b5a6
Revises: c3d4e5f6a7b8
Create Date: 2026-04-11

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "f1e2d3c4b5a6"
down_revision: str | Sequence[str] | None = "c3d4e5f6a7b8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "api_adapter_tool",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("workspace_id", sa.Integer(), nullable=False),
        sa.Column("tool_key", sa.String(length=128), nullable=False),
        sa.Column("name", sa.String(length=256), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("url", sa.String(length=2048), nullable=False),
        sa.Column(
            "args_schema_json",
            postgresql.JSONB(astext_type=sa.Text()).with_variant(sa.JSON(), "sqlite"),
            nullable=True,
        ),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
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
            ["workspace_id"],
            ["workspace.id"],
            name=op.f("fk_api_adapter_tool_workspace_id_workspace"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_api_adapter_tool")),
        sa.UniqueConstraint(
            "workspace_id",
            "tool_key",
            name=op.f("uq_api_adapter_tool_workspace_tool_key"),
        ),
    )
    op.create_index(
        op.f("ix_api_adapter_tool_workspace_id"),
        "api_adapter_tool",
        ["workspace_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_api_adapter_tool_tool_key"),
        "api_adapter_tool",
        ["tool_key"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_api_adapter_tool_tool_key"), table_name="api_adapter_tool")
    op.drop_index(op.f("ix_api_adapter_tool_workspace_id"), table_name="api_adapter_tool")
    op.drop_table("api_adapter_tool")
