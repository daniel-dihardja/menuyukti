"""Read markdown from the most recently updated milestonedata for a given dataTask."""

from __future__ import annotations

import json
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
                    elif isinstance(raw, dict):
                        start_date = raw.get("startDate")
                        end_date = raw.get("endDate")
                        public_holidays = raw.get("publicHolidays")
                        venue_snapshot = raw.get("venueSnapshot")
                        content_pillars = raw.get("contentPillars")
                        audience_hypotheses = raw.get("audienceHypotheses")
                        proof_oriented_angles = raw.get("proofOrientedAngles")
                        tone_guardrails = raw.get("toneGuardrails")

                        if (
                            isinstance(start_date, str)
                            and isinstance(end_date, str)
                            and isinstance(public_holidays, list)
                        ):
                            holiday_lines: list[str] = []
                            for holiday in public_holidays:
                                if not isinstance(holiday, dict):
                                    continue
                                name = holiday.get("name", "")
                                date = holiday.get("date", "")
                                description = holiday.get("description", "")
                                parts = [
                                    str(part).strip()
                                    for part in (name, date, description)
                                    if isinstance(part, str) and part.strip()
                                ]
                                if parts:
                                    holiday_lines.append(f"- {' - '.join(parts)}")
                            if not holiday_lines:
                                holiday_lines.append("- (none)")
                            md_body = (
                                "## Start date\n\n"
                                f"{start_date}\n\n"
                                "## End date\n\n"
                                f"{end_date}\n\n"
                                "## Public holidays\n\n"
                                f"{chr(10).join(holiday_lines)}"
                            )
                        elif (
                            isinstance(venue_snapshot, dict)
                            and isinstance(content_pillars, list)
                            and isinstance(audience_hypotheses, list)
                            and isinstance(proof_oriented_angles, list)
                            and isinstance(tone_guardrails, list)
                        ):
                            venue_name = venue_snapshot.get("venueName", "")
                            city = venue_snapshot.get("city", "")
                            country = venue_snapshot.get("country", "")
                            currency = venue_snapshot.get("currency", "")

                            def _render_lines(items: object) -> str:
                                if not isinstance(items, list):
                                    return "- (none)"
                                values = [
                                    f"- {str(item).strip()}"
                                    for item in items
                                    if str(item).strip()
                                ]
                                return "\n".join(values) if values else "- (none)"

                            md_body = (
                                "## Venue snapshot\n\n"
                                f"- Venue name: {venue_name or '(not set)'}\n"
                                f"- City: {city or '(not set)'}\n"
                                f"- Country: {country or '(not set)'}\n"
                                f"- Currency: {currency or '(not set)'}\n\n"
                                "## Content pillars\n\n"
                                f"{_render_lines(content_pillars)}\n\n"
                                "## Audience hypotheses\n\n"
                                f"{_render_lines(audience_hypotheses)}\n\n"
                                "## Proof-oriented angles\n\n"
                                f"{_render_lines(proof_oriented_angles)}\n\n"
                                "## Tone guardrails\n\n"
                                f"{_render_lines(tone_guardrails)}"
                            )
                        else:
                            md_body = (
                                "```json\n"
                                + json.dumps(raw, ensure_ascii=True, indent=2)
                                + "\n```"
                            )
                    elif isinstance(raw, list):
                        md_body = (
                            "```json\n"
                            + json.dumps(raw, ensure_ascii=True, indent=2)
                            + "\n```"
                        )
                sections.append(f"## {title}\n\n{md_body}\n")
            return "\n".join(sections).strip()
