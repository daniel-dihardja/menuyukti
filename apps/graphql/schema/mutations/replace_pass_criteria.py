"""Replace all passcriteria children under a milestone in one transaction."""

from __future__ import annotations

import strawberry

from graphql.data_sources import Node, SessionLocal
from graphql.schema.auth import require_location_owner, user_id_from_info
from graphql.schema.node_handlers import get_handler


def _pass_criterion_display_name(requirement: str) -> str:
    t = requirement.strip()
    if not t:
        return "Pass criterion"
    return t[:497] + "..." if len(t) > 500 else t


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

            existing = (
                session.query(Node)
                .filter(Node.parent_id == ms_pk, Node.node_type == "passcriteria")
                .all()
            )
            pc_handler = get_handler("passcriteria")
            for old in existing:
                pc_handler.pre_delete(old, milestone, session)
                session.delete(old)
            session.flush()

            for raw in requirements:
                r = raw.strip()
                if not r:
                    continue
                display = _pass_criterion_display_name(r)
                data = {"requirement": r, "status": "open"}
                resolved_data = pc_handler.validate_create(milestone, data, session)
                node = Node(
                    parent_id=ms_pk,
                    name=display,
                    description=None,
                    path="",
                    node_type="passcriteria",
                    location_id=location_id,
                    data=resolved_data,
                )
                session.add(node)
                session.flush()
                if milestone.path:
                    node.path = f"{milestone.path.rstrip('/')}/{node.id}"
                else:
                    node.path = f"/{node.id}"

            session.commit()
            return True
