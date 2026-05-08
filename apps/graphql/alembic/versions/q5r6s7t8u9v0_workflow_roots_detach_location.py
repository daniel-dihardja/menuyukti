"""Detach workflow nodes from location roots; normalize paths under workflow.

Revision ID: q5r6s7t8u9v0
Revises: k9l0m1n2o3p4
Create Date: 2026-05-08

Workflows are scoped by node.location_id only; parent_id should be NULL for
workflow roots. Reparents legacy rows that sat under the location synthetic
node and recomputes path for the workflow subtree.
"""

from __future__ import annotations

from collections.abc import Sequence

from sqlalchemy import text

from alembic import op

revision: str = "q5r6s7t8u9v0"
down_revision: str | Sequence[str] | None = "k9l0m1n2o3p4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _set_paths_down(conn, parent_id: int, parent_path: str) -> None:
    rows = conn.execute(
        text("SELECT id FROM node WHERE parent_id = :pid ORDER BY id"),
        {"pid": parent_id},
    ).fetchall()
    for (cid,) in rows:
        new_path = f"{parent_path.rstrip('/')}/{cid}"
        conn.execute(
            text("UPDATE node SET path = :p WHERE id = :id"),
            {"p": new_path, "id": cid},
        )
        _set_paths_down(conn, cid, new_path)


def upgrade() -> None:
    conn = op.get_bind()
    rows = conn.execute(
        text(
            """
            SELECT n.id FROM node AS n
            INNER JOIN node AS p ON p.id = n.parent_id
            WHERE n.type = 'workflow' AND p.type = 'location'
            """
        )
    ).fetchall()
    workflow_ids = [int(r[0]) for r in rows]

    for wf_id in workflow_ids:
        conn.execute(
            text(
                """
                UPDATE node
                SET parent_id = NULL,
                    path = '/' || CAST(id AS TEXT)
                WHERE id = :wid AND type = 'workflow'
                """
            ),
            {"wid": wf_id},
        )
        root_path = f"/{wf_id}"
        _set_paths_down(conn, wf_id, root_path)


def downgrade() -> None:
    """Cannot restore prior parents without storing old edges; no-op."""
