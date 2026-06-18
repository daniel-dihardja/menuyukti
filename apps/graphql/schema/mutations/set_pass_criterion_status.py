"""Atomic update of one pass criterion status on a milestone row (avoids lost updates under parallel eval)."""

from __future__ import annotations

from typing import Any

import strawberry

from graphql.context import request_session_scope
from graphql.data_sources import Node
from graphql.schema.auth import require_location_owner, user_id_from_info

_ALLOWED = frozenset({"pass", "fail", "open"})


@strawberry.type
class SetPassCriterionStatusMutation:
    @strawberry.mutation
    def set_pass_criterion_status(
        self,
        info: strawberry.Info,
        milestone_id: strawberry.ID,
        location_id: int,
        criterion_id: str,
        status: str,
    ) -> bool:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for setPassCriterionStatus")

        st = status.strip().lower()
        if st not in _ALLOWED:
            raise ValueError("status must be pass, fail, or open")

        cid = criterion_id.strip()
        if not cid:
            raise ValueError("criterion_id cannot be empty")

        try:
            ms_pk = int(str(milestone_id))
        except ValueError as e:
            raise ValueError("Invalid milestone id") from e
        if ms_pk < 1:
            raise ValueError("Invalid milestone id")

        with request_session_scope(info) as session:
            require_location_owner(session, location_id, user_id)

            milestone = session.query(Node).filter(Node.id == ms_pk).with_for_update().one_or_none()
            if milestone is None:
                raise ValueError("Milestone not found")
            if milestone.node_type != "milestone":
                raise ValueError("Node is not a milestone")
            if milestone.location_id != location_id:
                raise ValueError("Milestone does not belong to this location")

            raw_pc = milestone.pass_criterias
            rows: list[dict[str, Any]] = list(raw_pc) if isinstance(raw_pc, list) else []
            found = False
            next_rows: list[dict[str, Any]] = []
            for item in rows:
                if not isinstance(item, dict):
                    continue
                item_id = item.get("id")
                if item_id == cid:
                    req = item.get("requirement")
                    next_rows.append(
                        {
                            "id": cid,
                            "requirement": req if isinstance(req, str) else "",
                            "status": st,
                        }
                    )
                    found = True
                else:
                    next_rows.append(item)

            if not found:
                raise ValueError(f"criterion not found: {cid}")

            milestone.pass_criterias = next_rows

            base = dict(milestone.data) if isinstance(milestone.data, dict) else {}
            base.pop("passCriterias", None)
            milestone.data = base

            session.commit()
            return True
