"""Prior-milestone data aggregation for workflow campaign trees (JSON array)."""

from __future__ import annotations

from typing import Any, cast

import strawberry
from strawberry.scalars import JSON

from graphql.data_sources import Node, SessionLocal
from graphql.schema.auth import is_location_owner, user_id_from_info
from graphql.schema.node_handlers.milestone import _milestone_sort_key


@strawberry.type
class MilestonePriorDataQuery:
    @strawberry.field(
        description=(
            "JSON array of prior milestones' milestonedata payloads: each element is "
            "`{\"title\": string, \"data\": object|string|array|null}` for milestones strictly "
            "before the given milestone in workflow display order. `data` is the raw `milestonedata` "
            "child `data` field (structured object, legacy string, or null). Empty array when there "
            "are no prior milestones or the request is not authorized."
        )
    )
    def prior_milestones_milestone_data(
        self,
        info: strawberry.Info,
        workflow_id: strawberry.ID,
        milestone_id: strawberry.ID,
        location_id: int,
    ) -> JSON:
        user_id = user_id_from_info(info)
        if not user_id:
            return cast(JSON, [])
        try:
            wf_pk = int(str(workflow_id))
            ms_pk = int(str(milestone_id))
        except ValueError:
            return cast(JSON, [])
        if wf_pk < 1 or ms_pk < 1:
            return cast(JSON, [])
        with SessionLocal() as session:
            if not is_location_owner(session, location_id, user_id):
                return cast(JSON, [])
            root = session.get(Node, wf_pk)
            if root is None or root.node_type != "workflow":
                return cast(JSON, [])
            if root.location_id != location_id:
                return cast(JSON, [])

            current = session.get(Node, ms_pk)
            if current is None or current.node_type != "milestone":
                return cast(JSON, [])
            if current.parent_id != wf_pk or current.location_id != location_id:
                return cast(JSON, [])

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
                return cast(JSON, [])
            if idx <= 0:
                return cast(JSON, [])

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

            return cast(JSON, payload)
