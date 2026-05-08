"""Move milestone goal from goal child nodes into milestone.data.goal.

Revision ID: j2k3l4m5n6o7
Revises: h1i2j3k4l5m6
Create Date: 2026-05-08

Deploy GraphQL with this migration before removing GoalHandler: it deletes
all rows where type='goal' after copying text into the parent milestone.
"""

from __future__ import annotations

import json
from collections import defaultdict
from collections.abc import Sequence
from typing import Any

from sqlalchemy import text

from alembic import op

revision: str = "j2k3l4m5n6o7"
down_revision: str | Sequence[str] | None = "h1i2j3k4l5m6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _parse_node_data(raw: object) -> dict[str, Any]:
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        try:
            loaded = json.loads(raw)
        except json.JSONDecodeError:
            return {}
        return loaded if isinstance(loaded, dict) else {}
    return {}


def _goal_text_from_child_data(data: dict[str, Any]) -> str | None:
    g = data.get("goal")
    if not isinstance(g, str):
        return None
    s = g.strip()
    return s or None


def upgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name

    if dialect == "postgresql":
        bind.execute(
            text(
                """
                WITH ranked AS (
                    SELECT
                        parent_id,
                        data,
                        ROW_NUMBER() OVER (
                            PARTITION BY parent_id
                            ORDER BY updated_at DESC NULLS LAST, id DESC
                        ) AS rn
                    FROM node
                    WHERE type = 'goal' AND parent_id IS NOT NULL
                ),
                best AS (
                    SELECT parent_id, data
                    FROM ranked
                    WHERE rn = 1
                )
                UPDATE node AS m
                SET data = jsonb_set(
                    COALESCE(m.data, '{}'::jsonb),
                    '{goal}',
                    to_jsonb(trim(both FROM COALESCE(best.data->>'goal', '')))
                )
                FROM best
                WHERE m.id = best.parent_id
                  AND m.type = 'milestone'
                  AND NULLIF(trim(both FROM COALESCE(best.data->>'goal', '')), '') IS NOT NULL
                """
            )
        )
        bind.execute(text("DELETE FROM node WHERE type = 'goal'"))
        return

    # SQLite (and other): ORM-neutral row updates.
    rows = bind.execute(
        text("SELECT id, parent_id, data, updated_at FROM node WHERE type = 'goal'")
    ).fetchall()
    by_parent: dict[int, list[tuple[int, object, object]]] = defaultdict(list)
    for row in rows:
        pid = row[1]
        if pid is None:
            continue
        by_parent[int(pid)].append((int(row[0]), row[2], row[3]))

    for parent_id, goals in by_parent.items():
        best = max(goals, key=lambda t: (t[2] is not None, t[2] or 0, t[0]))
        child_data = _parse_node_data(best[1])
        gtxt = _goal_text_from_child_data(child_data)
        if not gtxt:
            continue
        mrow = bind.execute(
            text("SELECT id, data FROM node WHERE id = :pid AND type = 'milestone'"),
            {"pid": parent_id},
        ).fetchone()
        if mrow is None:
            continue
        mdata = _parse_node_data(mrow[1])
        mdata["goal"] = gtxt
        bind.execute(
            text("UPDATE node SET data = :data WHERE id = :mid"),
            {"mid": int(mrow[0]), "data": json.dumps(mdata)},
        )

    bind.execute(text("DELETE FROM node WHERE type = 'goal'"))


def downgrade() -> None:
    """No-op: deleted ``goal`` rows cannot be restored; ``milestone.data.goal`` is left as-is."""
    pass
