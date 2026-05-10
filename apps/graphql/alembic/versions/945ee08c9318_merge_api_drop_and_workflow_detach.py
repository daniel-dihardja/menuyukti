"""merge_api_drop_and_workflow_detach

Unify parallel branches: drop_api_adapter_tool (m1n2o3p4q5r6) and
workflow_roots_detach_location (q5r6s7t8u9v0) both revised d33dbb3268a7.

Revision ID: 945ee08c9318
Revises: m1n2o3p4q5r6, q5r6s7t8u9v0
Create Date: 2026-05-10 13:01:41.190860

"""

from __future__ import annotations

from collections.abc import Sequence

# revision identifiers, used by Alembic.
revision: str = "945ee08c9318"
down_revision: str | Sequence[str] | None = ("m1n2o3p4q5r6", "q5r6s7t8u9v0")
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
