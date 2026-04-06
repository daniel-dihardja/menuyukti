"""Fallback handler for node types without dedicated rules (extensible JSON)."""

from __future__ import annotations

from sqlalchemy.orm import Session

from graphql.data_sources import Node
from graphql.schema.node_handlers.base import NodeHandler


class GenericHandler(NodeHandler):
    """Permissive create; update/delete remain restricted unless a specific handler is registered."""

    node_type = "generic"

    def validate_create(
        self,
        parent: Node | None,
        data: dict | None,
        session: Session | None = None,
    ) -> dict | None:
        return data
