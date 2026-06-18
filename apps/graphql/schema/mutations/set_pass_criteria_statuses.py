"""Batch update pass criterion statuses on a milestone (eval subgraph)."""

from __future__ import annotations

from typing import Any

import strawberry

from graphql.data_sources import Node, SessionLocal
from graphql.schema.auth import require_location_owner, user_id_from_info
from graphql.schema.mutations.set_pass_criterion_status import _ALLOWED


@strawberry.input
class PassCriterionStatusInput:
    criterion_id: str
    status: str


@strawberry.type
class SetPassCriteriaStatusesMutation:
    @strawberry.mutation
    def set_pass_criteria_statuses(
        self,
        info: strawberry.Info,
        milestone_id: strawberry.ID,
        location_id: int,
        updates: list[PassCriterionStatusInput],
    ) -> bool:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for setPassCriteriaStatuses")
        if not updates:
            return True

        try:
            ms_pk = int(str(milestone_id))
        except ValueError as e:
            raise ValueError("Invalid milestone id") from e
        if ms_pk < 1:
            raise ValueError("Invalid milestone id")

        normalized: list[tuple[str, str]] = []
        for item in updates:
            cid = item.criterion_id.strip()
            if not cid:
                raise ValueError("criterion_id cannot be empty")
            st = item.status.strip().lower()
            if st not in _ALLOWED:
                raise ValueError("status must be pass, fail, or open")
            normalized.append((cid, st))

        with SessionLocal() as session:
            require_location_owner(session, location_id, user_id, info=info)

            milestone = (
                session.query(Node)
                .filter(Node.id == ms_pk)
                .with_for_update()
                .one_or_none()
            )
            if milestone is None:
                raise ValueError("Milestone not found")
            if milestone.node_type != "milestone":
                raise ValueError("Node is not a milestone")
            if milestone.location_id != location_id:
                raise ValueError("Milestone does not belong to this location")

            raw_pc = milestone.pass_criterias
            rows: list[dict[str, Any]] = list(raw_pc) if isinstance(raw_pc, list) else []
            update_map = dict(normalized)
            next_rows: list[dict[str, Any]] = []
            found_ids: set[str] = set()
            for item in rows:
                if not isinstance(item, dict):
                    continue
                item_id = item.get("id")
                if not isinstance(item_id, str):
                    next_rows.append(item)
                    continue
                if item_id in update_map:
                    req = item.get("requirement")
                    next_rows.append(
                        {
                            "id": item_id,
                            "requirement": req if isinstance(req, str) else "",
                            "status": update_map[item_id],
                        }
                    )
                    found_ids.add(item_id)
                else:
                    next_rows.append(item)

            missing = set(update_map.keys()) - found_ids
            if missing:
                raise ValueError(f"criterion not found: {sorted(missing)[0]}")

            milestone.pass_criterias = next_rows
            base = dict(milestone.data) if isinstance(milestone.data, dict) else {}
            base.pop("passCriterias", None)
            milestone.data = base
            session.commit()
            return True
