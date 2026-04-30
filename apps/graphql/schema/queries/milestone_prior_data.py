"""Prior-milestone data aggregation for workflow campaign trees (JSON text)."""

from __future__ import annotations

import json
from typing import Any

import strawberry

from graphql.data_sources import Node, SessionLocal
from graphql.schema.auth import is_location_owner, user_id_from_info
from graphql.schema.node_handlers.milestone import _milestone_sort_key


@strawberry.type
class MilestonePriorDataQuery:
    @strawberry.field(
        description=(
            "JSON array (pretty-printed string) of prior milestones' milestonedata payloads: each "
            "element is `{\"title\": string, \"data\": object|string|null}` for milestones strictly "
            "before the given milestone in workflow display order. `data` is the raw `milestonedata` "
            "child `data` field (structured object, legacy string, or null). Empty string when there "
            "are no prior milestones."
        )
    )
    def prior_milestones_milestone_data(
        self,
        info: strawberry.Info,
        workflow_id: strawberry.ID,
        milestone_id: strawberry.ID,
        location_id: int,
    ) -> str:
        user_id = user_id_from_info(info)
        if not user_id:
            return ""
        try:
            wf_pk = int(str(workflow_id))
            ms_pk = int(str(milestone_id))
        except ValueError:
            return ""
        if wf_pk < 1 or ms_pk < 1:
            return ""
        with SessionLocal() as session:
            if not is_location_owner(session, location_id, user_id):
                return ""
            root = session.get(Node, wf_pk)
            if root is None or root.node_type != "workflow":
                return ""
            if root.location_id != location_id:
                return ""

            current = session.get(Node, ms_pk)
            if current is None or current.node_type != "milestone":
                return ""
            if current.parent_id != wf_pk or current.location_id != location_id:
                return ""

            rows = (
                session.query(Node)
                .filter(
                    Node.parent_id == wf_pk,
                    Node.node_type == "milestone",
                    Node.location_id == location_id,
                )
                .order_by(Node.created_at.asc())
                .all()
            )
            milestones = sorted(rows, key=_milestone_sort_key)
            ids = [m.id for m in milestones]
            try:
                idx = ids.index(ms_pk)
            except ValueError:
                return ""
            if idx <= 0:
                return ""

            payload: list[dict[str, Any]] = []
            for m in milestones[:idx]:
                title = m.name or "Milestone"
                data_val: object | str | None = None
                md_row = (
                    session.query(Node)
                    .filter(
                        Node.parent_id == m.id,
                        Node.node_type == "milestonedata",
                    )
                    .order_by(Node.id.asc())
                    .first()
                )
                if md_row is not None and isinstance(md_row.data, dict):
                    raw = md_row.data.get("data")
                    if isinstance(raw, (str, dict, list)):
                        data_val = raw
                payload.append({"title": title, "data": data_val})

            return json.dumps(payload, ensure_ascii=False, indent=2)
