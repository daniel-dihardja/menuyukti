"""Add milestone-first columns on node; backfill from data + children; drop legacy child rows.

Revision ID: k9l0m1n2o3p4
Revises: j2k3l4m5n6o7
Create Date: 2026-05-08

Copies goal, milestoneInput, passCriterias from milestone.data JSON; preset payload
from milestonedata children (largest JSON wins); result from result children (latest
updated_at). Deletes milestonedata, result, and passcriteria rows after copy.
"""

from __future__ import annotations

import json
from collections import defaultdict
from collections.abc import Sequence
from typing import Any

import sqlalchemy as sa
from sqlalchemy import Text, text
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op

revision: str = "k9l0m1n2o3p4"
down_revision: str | Sequence[str] | None = "j2k3l4m5n6o7"
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


def _json_size(obj: object) -> int:
    try:
        return len(json.dumps(obj, ensure_ascii=False))
    except (TypeError, ValueError):
        return 0


def _json_param(value: object, dialect: str) -> object:
    if dialect == "postgresql":
        return value
    return json.dumps(value)


def upgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name

    json_type = JSONB().with_variant(sa.JSON(), "sqlite")
    op.add_column("node", sa.Column("milestone_goal", Text(), nullable=True))
    op.add_column("node", sa.Column("milestone_input", json_type, nullable=True))
    op.add_column("node", sa.Column("pass_criterias", json_type, nullable=True))
    op.add_column("node", sa.Column("milestone_preset_data", json_type, nullable=True))
    op.add_column("node", sa.Column("milestone_result", json_type, nullable=True))

    m_rows = bind.execute(
        text("SELECT id, data FROM node WHERE type = 'milestone'")
    ).fetchall()
    milestone_ids = [int(r[0]) for r in m_rows]
    children_by_parent: dict[int, list[tuple[int, str, object, object]]] = defaultdict(list)
    if milestone_ids:
        placeholders = ",".join(str(i) for i in milestone_ids)
        ch = bind.execute(
            text(
                f"""
                SELECT id, parent_id, type, data, updated_at
                FROM node
                WHERE parent_id IN ({placeholders})
                  AND type IN ('milestonedata', 'result', 'passcriteria')
                """
            )
        ).fetchall()
        for row in ch:
            pid = row[1]
            if pid is None:
                continue
            children_by_parent[int(pid)].append(
                (int(row[0]), str(row[2]), row[3], row[4])
            )

    for row in m_rows:
        mid = int(row[0])
        mdata = _parse_node_data(row[1])

        goal_txt = mdata.get("goal")
        if isinstance(goal_txt, str) and goal_txt.strip():
            bind.execute(
                text("UPDATE node SET milestone_goal = :g WHERE id = :id"),
                {"g": goal_txt.strip(), "id": mid},
            )

        mi = mdata.get("milestoneInput")
        if mi is not None:
            bind.execute(
                text("UPDATE node SET milestone_input = :mi WHERE id = :id"),
                {"mi": _json_param(mi, dialect), "id": mid},
            )

        pc = mdata.get("passCriterias")
        if isinstance(pc, list) and pc:
            bind.execute(
                text("UPDATE node SET pass_criterias = :pc WHERE id = :id"),
                {"pc": _json_param(pc, dialect), "id": mid},
            )

        md_candidates: list[tuple[int, dict[str, Any]]] = []
        for cid, nt, raw_data, _ua in children_by_parent.get(mid, []):
            if nt != "milestonedata":
                continue
            parsed = _parse_node_data(raw_data)
            if parsed:
                md_candidates.append((cid, parsed))
        if md_candidates:

            def _md_key(item: tuple[int, dict[str, Any]]) -> tuple[int, int]:
                cid, payload = item
                return (_json_size(payload), cid)

            _best_cid, best_payload = max(md_candidates, key=_md_key)
            bind.execute(
                text(
                    "UPDATE node SET milestone_preset_data = :d WHERE id = :id"
                ),
                {"d": _json_param(best_payload, dialect), "id": mid},
            )

        res_candidates: list[tuple[int, dict[str, Any], object]] = []
        for cid, nt, raw_data, updated_at in children_by_parent.get(mid, []):
            if nt != "result":
                continue
            parsed = _parse_node_data(raw_data)
            if parsed:
                res_candidates.append((cid, parsed, updated_at))
        if res_candidates:

            def _res_key(item: tuple[int, dict[str, Any], object]) -> tuple:
                cid, _, ua = item
                ts = ua if ua is not None else 0
                return (ts, cid)

            _best_id, best_res, _ = max(res_candidates, key=_res_key)
            bind.execute(
                text("UPDATE node SET milestone_result = :r WHERE id = :id"),
                {"r": _json_param(best_res, dialect), "id": mid},
            )

        existing_pc = mdata.get("passCriterias")
        if not (isinstance(existing_pc, list) and existing_pc):
            built: list[dict[str, Any]] = []
            for cid, nt, raw_data, _ua in children_by_parent.get(mid, []):
                if nt != "passcriteria":
                    continue
                pd = _parse_node_data(raw_data)
                req = pd.get("requirement")
                st = pd.get("status")
                if not isinstance(req, str):
                    continue
                if st not in ("pass", "fail", "open"):
                    continue
                built.append(
                    {"id": str(cid), "requirement": req, "status": str(st)}
                )
            if built:
                bind.execute(
                    text(
                        "UPDATE node SET pass_criterias = :pc WHERE id = :id AND pass_criterias IS NULL"
                    ),
                    {"pc": _json_param(built, dialect), "id": mid},
                )

    bind.execute(
        text(
            "DELETE FROM node WHERE type IN ('milestonedata', 'result', 'passcriteria')"
        )
    )


def downgrade() -> None:
    op.drop_column("node", "milestone_result")
    op.drop_column("node", "milestone_preset_data")
    op.drop_column("node", "pass_criterias")
    op.drop_column("node", "milestone_input")
    op.drop_column("node", "milestone_goal")
