"""Update a workflow-scoped Instagram item."""

from __future__ import annotations

from datetime import datetime

import strawberry
from strawberry import UNSET

from graphql.context import request_session_scope
from graphql.schema.auth import user_id_from_info
from graphql.schema.instagram_items_common import (
    item_to_gql,
    load_item_for_owner,
    normalize_kind,
    normalize_optional_text,
    normalize_status,
    parse_positive_id,
)
from graphql.schema.types.instagram_item import InstagramItemType


@strawberry.type
class UpdateInstagramItemMutation:
    @strawberry.mutation
    def update_instagram_item(
        self,
        info: strawberry.Info,
        id: strawberry.ID,
        kind: str | None = None,
        title: str | None = None,
        caption: str | None = None,
        hook: str | None = None,
        visual_brief: str | None = None,
        status: str | None = None,
        schedule: datetime | None = UNSET,
    ) -> InstagramItemType:
        """Patch provided fields. Empty strings clear nullable text fields.

        ``schedule`` uses UNSET so omit leaves unchanged and explicit null clears.
        """
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for updateInstagramItem")

        item_pk = parse_positive_id(id, label="instagram item id")

        with request_session_scope(info) as session:
            row = load_item_for_owner(session, item_pk, user_id)

            if kind is not None:
                row.kind = normalize_kind(kind)
            if title is not None:
                row.title = normalize_optional_text(title, max_len=256)
            if caption is not None:
                row.caption = normalize_optional_text(caption)
            if hook is not None:
                row.hook = normalize_optional_text(hook)
            if visual_brief is not None:
                row.visual_brief = normalize_optional_text(visual_brief)
            if status is not None:
                row.status = normalize_status(status)
            if schedule is not UNSET:
                row.schedule = schedule

            session.commit()
            session.refresh(row)
            return item_to_gql(row)
