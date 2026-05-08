"""Replace all pass criteria on a milestone (stored on the milestone row)."""

from __future__ import annotations

import secrets

import strawberry

from graphql.data_sources import Node, SessionLocal
from graphql.schema.auth import require_location_owner, user_id_from_info


@strawberry.type
class ReplacePassCriteriaMutation:
    @strawberry.mutation
    def replace_pass_criteria(
        self,
        info: strawberry.Info,
        milestone_id: strawberry.ID,
        location_id: int,
        requirements: list[str],
    ) -> bool:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for replacePassCriteria")

        try:
            ms_pk = int(str(milestone_id))
        except ValueError as e:
            raise ValueError("Invalid milestone id") from e
        if ms_pk < 1:
            raise ValueError("Invalid milestone id")

        with SessionLocal() as session:
            require_location_owner(session, location_id, user_id)

            milestone = session.get(Node, ms_pk)
            if milestone is None:
                raise ValueError("Milestone not found")
            if milestone.node_type != "milestone":
                raise ValueError("Node is not a milestone")
            if milestone.location_id != location_id:
                raise ValueError("Milestone does not belong to this location")

            rows: list[dict[str, str]] = []
            for raw in requirements:
                r = raw.strip()
                if not r:
                    continue
                rows.append(
                    {
                        "id": secrets.token_hex(8),
                        "requirement": r,
                        "status": "open",
                    }
                )

            milestone.pass_criterias = rows if rows else None
            base = dict(milestone.data) if isinstance(milestone.data, dict) else {}
            base.pop("passCriterias", None)
            milestone.data = base

            session.commit()
            return True
