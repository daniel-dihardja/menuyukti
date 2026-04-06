import secrets
import uuid

import strawberry

from graphql.data_sources import Node, SessionLocal
from graphql.schema.auth import require_location_owner, user_id_from_info
from graphql.schema.types import NodeType

_ADJECTIVES = ("Swift", "Bright", "Urban", "Golden", "Fresh", "Bold")
_NOUNS = ("Launch", "Push", "Drive", "Wave", "Spark", "Pulse")


def _random_campaign_name() -> str:
    return f"{secrets.choice(_ADJECTIVES)} {secrets.choice(_NOUNS)} {secrets.token_hex(2).upper()}"


@strawberry.type
class CreateCampaignMutation:
    @strawberry.mutation
    def create_campaign(self, info: strawberry.Info, location_id: int) -> NodeType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for createCampaign")

        session = SessionLocal()
        try:
            require_location_owner(session, location_id, user_id)

            node_id = uuid.uuid4()
            path = f"/{node_id}"
            name = _random_campaign_name()

            node = Node(
                id=node_id,
                parent_id=None,
                name=name,
                path=path,
                node_type="campaign",
                location_id=location_id,
            )
            session.add(node)
            session.commit()
            session.refresh(node)

            return NodeType(
                id=str(node.id),
                name=node.name,
                node_type=node.node_type,
                path=node.path,
                parent_id=str(node.parent_id) if node.parent_id is not None else None,
                location_id=node.location_id,
            )
        finally:
            session.close()
