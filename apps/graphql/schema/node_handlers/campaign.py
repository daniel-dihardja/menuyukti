"""Campaign node: same create/update data behavior as generic; delete stays restricted in base defaults."""

from __future__ import annotations

from graphql.schema.node_handlers._generic import GenericHandler


class CampaignHandler(GenericHandler):
    node_type = "campaign"
