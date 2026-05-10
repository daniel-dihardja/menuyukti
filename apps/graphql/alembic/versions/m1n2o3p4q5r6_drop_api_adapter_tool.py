"""drop api_adapter_tool table

Revision ID: m1n2o3p4q5r6
Revises: d33dbb3268a7
Create Date: 2026-05-10

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "m1n2o3p4q5r6"
down_revision: str | Sequence[str] | None = "d33dbb3268a7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_index(op.f("ix_api_adapter_tool_tool_key"), table_name="api_adapter_tool")
    op.drop_index(op.f("ix_api_adapter_tool_workspace_id"), table_name="api_adapter_tool")
    op.drop_table("api_adapter_tool")


def downgrade() -> None:
    """Table recreation omitted; upgrade is the supported direction for this removal."""
    pass
