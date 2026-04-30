"""Flatten milestonedata node JSON: store preset payload at root, not {data: payload}.

Revision ID: g8h7i6j5k4l3
Revises: f8a9b0c1d2e3
Create Date: 2026-04-30

Legacy rows used node.data = {"data": <object|string|array>}.
After upgrade, node.data is the inner object/array directly, or {} when inner was
string/null/empty (breaking change for legacy markdown-in-data strings).

Downgrade wraps non-null object payloads back under {"data": ...}.
"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any

import sqlalchemy as sa

from alembic import op

revision: str = "g8h7i6j5k4l3"
down_revision: str | Sequence[str] | None = "f8a9b0c1d2e3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute(
            sa.text(
                """
                UPDATE node
                SET data = data->'data'
                WHERE type = 'milestonedata'
                  AND data IS NOT NULL
                  AND jsonb_typeof(data) = 'object'
                  AND data ? 'data'
                  AND jsonb_typeof(data->'data') IN ('object', 'array')
                """
            )
        )
        op.execute(
            sa.text(
                """
                UPDATE node
                SET data = '{}'::jsonb
                WHERE type = 'milestonedata'
                  AND data IS NOT NULL
                  AND jsonb_typeof(data) = 'object'
                  AND data ? 'data'
                  AND jsonb_typeof(data->'data') NOT IN ('object', 'array')
                """
            )
        )
        return

    # SQLite (e.g. dev/test): unwrap in Python.
    conn = bind
    rows = conn.execute(
        sa.text("SELECT id, data FROM node WHERE type = :t"),
        {"t": "milestonedata"},
    ).fetchall()
    for row in rows:
        nid = row[0]
        raw: Any = row[1]
        if raw is None:
            continue
        d = raw if isinstance(raw, dict) else None
        if not isinstance(d, dict) or "data" not in d:
            continue
        inner = d.get("data")
        if isinstance(inner, (dict, list)):
            new_val: Any = inner
        else:
            new_val = {}
        conn.execute(
            sa.text("UPDATE node SET data = :data WHERE id = :id"),
            {"data": new_val, "id": nid},
        )


def downgrade() -> None:
    """Re-wrap flat preset objects as {"data": <object>}. Skip rows that still look like legacy envelope."""
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute(
            sa.text(
                """
                UPDATE node
                SET data = jsonb_build_object('data', data)
                WHERE type = 'milestonedata'
                  AND data IS NOT NULL
                  AND jsonb_typeof(data) = 'object'
                  AND NOT (
                    (SELECT COUNT(*) FROM jsonb_object_keys(data)) = 1
                    AND data ? 'data'
                  )
                """
            )
        )
        return

    conn = bind
    rows = conn.execute(
        sa.text("SELECT id, data FROM node WHERE type = :t"),
        {"t": "milestonedata"},
    ).fetchall()
    for row in rows:
        nid = row[0]
        raw: Any = row[1]
        if raw is None:
            continue
        d = raw if isinstance(raw, dict) else None
        if not isinstance(d, dict):
            continue
        keys = list(d.keys())
        if len(keys) == 1 and keys[0] == "data":
            continue
        wrapped = {"data": d}
        conn.execute(
            sa.text("UPDATE node SET data = :data WHERE id = :id"),
            {"data": wrapped, "id": nid},
        )
