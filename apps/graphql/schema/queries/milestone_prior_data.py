"""Read markdown from the most recently updated milestonedata for a given dataTask."""

from __future__ import annotations

from datetime import datetime

import strawberry

from graphql.data_sources import Node, SessionLocal
from graphql.schema.auth import is_location_owner, user_id_from_info
from graphql.schema.node_handlers.milestone import _milestone_sort_key


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

    @strawberry.field(
        description=(
            "Markdown sections (## title + body) for each milestone strictly before the given "
            "milestone in workflow display order, using each prior milestone's first milestonedata "
            "child body. Empty string when there are no prior milestones or no content."
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

            sections: list[str] = []
            for m in milestones[:idx]:
                title = m.name or "Milestone"
                md_body = ""
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
                    if isinstance(raw, str):
                        md_body = raw
                sections.append(f"## {title}\n\n{md_body}\n")
            return "\n".join(sections).strip()
