"""Campaign node: same create behavior as generic; update/delete stay restricted in base defaults."""

from __future__ import annotations

from graphql.data_sources import Node
from graphql.schema.node_handlers._generic import GenericHandler


class CampaignHandler(GenericHandler):
    node_type = "campaign"

    def validate_update(self, node: Node, parent: Node | None, data: dict | None) -> None:
        raise ValueError("Campaign nodes cannot be updated with this mutation")
