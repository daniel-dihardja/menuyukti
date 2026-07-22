"""Shared helpers for Instagram item GraphQL operations."""

from __future__ import annotations

import strawberry

from graphql.data_sources import InstagramItem, Node
from graphql.schema.auth import is_location_owner
from graphql.schema.types.instagram_item import InstagramItemType

VALID_KINDS = frozenset({"story", "post", "reel"})
VALID_STATUSES = frozenset({"draft", "ready"})


def item_to_gql(row: InstagramItem) -> InstagramItemType:
    return InstagramItemType(
        id=strawberry.ID(str(row.id)),
        workflow_id=strawberry.ID(str(row.workflow_id)),
        location_id=row.location_id,
        kind=row.kind,
        title=row.title,
        caption=row.caption,
        hook=row.hook,
        visual_brief=row.visual_brief,
        status=row.status,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def parse_positive_id(raw: object, *, label: str) -> int:
    try:
        pk = int(str(raw))
    except (TypeError, ValueError) as e:
        raise ValueError(f"Invalid {label}") from e
    if pk < 1:
        raise ValueError(f"Invalid {label}")
    return pk


def normalize_kind(kind: str) -> str:
    cleaned = kind.strip().lower()
    if cleaned not in VALID_KINDS:
        raise ValueError(f"kind must be one of: {', '.join(sorted(VALID_KINDS))}")
    return cleaned


def normalize_status(status: str) -> str:
    cleaned = status.strip().lower()
    if cleaned not in VALID_STATUSES:
        raise ValueError(f"status must be one of: {', '.join(sorted(VALID_STATUSES))}")
    return cleaned


def normalize_optional_text(value: str | None, *, max_len: int | None = None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    if cleaned == "":
        return None
    if max_len is not None and len(cleaned) > max_len:
        raise ValueError(f"Text exceeds maximum length of {max_len}")
    return cleaned


def load_workflow_for_owner(session, workflow_pk: int, user_id: str) -> Node:
    workflow = session.get(Node, workflow_pk)
    if workflow is None or workflow.node_type != "workflow":
        raise ValueError("Workflow not found")
    if workflow.location_id is None:
        raise ValueError("Workflow has no location")
    if not is_location_owner(session, workflow.location_id, user_id):
        raise PermissionError("Not allowed to access this workflow")
    return workflow


def load_item_for_owner(session, item_pk: int, user_id: str) -> InstagramItem:
    row = session.get(InstagramItem, item_pk)
    if row is None:
        raise ValueError("Instagram item not found")
    if not is_location_owner(session, row.location_id, user_id):
        raise PermissionError("Not allowed to access this Instagram item")
    return row
