"""Read markdown from the most recently updated milestonedata for a given dataTask."""

from __future__ import annotations

from datetime import datetime

import strawberry

from graphql.data_sources import Node, SessionLocal
from graphql.schema.auth import is_location_owner, user_id_from_info


@strawberry.type
class MilestonePriorDataQuery:
    @strawberry.field(
        description=(
            "Markdown body from the milestonedata child of the most recently updated milestone "
            "under the workflow whose milestone.data.dataTask matches ``data_task``. "
            "Returns null when none match or content is empty."
        )
    )
    def most_recent_milestone_data(
        self,
        info: strawberry.Info,
        workflow_id: strawberry.ID,
        data_task: str,
    ) -> str | None:
        user_id = user_id_from_info(info)
        try:
            wf_pk = int(str(workflow_id))
        except ValueError:
            return None
        if wf_pk < 1:
            return None
        with SessionLocal() as session:
            root = session.get(Node, wf_pk)
            if root is None or root.node_type != "workflow":
                return None
            if root.location_id is None:
                return None
            if not is_location_owner(session, root.location_id, user_id):
                return None

            milestones = (
                session.query(Node)
                .filter(
                    Node.parent_id == wf_pk,
                    Node.node_type == "milestone",
                )
                .all()
            )
            candidates: list[tuple[object, str]] = []
            for m in milestones:
                if not isinstance(m.data, dict) or m.data.get("dataTask") != data_task:
                    continue
                md_node = (
                    session.query(Node)
                    .filter(
                        Node.parent_id == m.id,
                        Node.node_type == "milestonedata",
                    )
                    .first()
                )
                if md_node is None or not isinstance(md_node.data, dict):
                    continue
                raw = md_node.data.get("data")
                if not isinstance(raw, str) or not raw.strip():
                    continue
                ts = md_node.updated_at or md_node.created_at
                candidates.append((ts, raw))

            if not candidates:
                return None

            def _ts(item: tuple[object, str]) -> float:
                t0 = item[0]
                if isinstance(t0, datetime):
                    return t0.timestamp()
                return 0.0

            candidates.sort(key=_ts, reverse=True)
            return candidates[0][1]
