"""Create a workflow-scoped Instagram item."""

from __future__ import annotations

from datetime import datetime

import strawberry

from graphql.context import request_session_scope
from graphql.data_sources import InstagramItem, InstagramItemPage
from graphql.schema.auth import user_id_from_info
from graphql.schema.instagram_items_common import (
    item_to_gql,
    load_workflow_for_owner,
    normalize_kind,
    normalize_optional_text,
    normalize_status,
    parse_positive_id,
    reload_item_with_pages,
)
from graphql.schema.types.instagram_item import InstagramItemType


@strawberry.type
class CreateInstagramItemMutation:
    @strawberry.mutation
    def create_instagram_item(
        self,
        info: strawberry.Info,
        workflow_id: strawberry.ID,
        kind: str,
        title: str | None = None,
        caption: str | None = None,
        hook: str | None = None,
        visual_brief: str | None = None,
        status: str | None = None,
        schedule: datetime | None = None,
    ) -> InstagramItemType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for createInstagramItem")

        workflow_pk = parse_positive_id(workflow_id, label="workflow id")
        kind_clean = normalize_kind(kind)
        title_clean = normalize_optional_text(title, max_len=256)
        caption_clean = normalize_optional_text(caption)
        hook_clean = normalize_optional_text(hook)
        visual_brief_clean = normalize_optional_text(visual_brief)
        status_clean = normalize_status(status) if status is not None else "draft"

        with request_session_scope(info) as session:
            workflow = load_workflow_for_owner(session, workflow_pk, user_id)
            assert workflow.location_id is not None
            row = InstagramItem(
                workflow_id=workflow.id,
                location_id=workflow.location_id,
                kind=kind_clean,
                title=title_clean,
                caption=caption_clean,
                hook=hook_clean,
                visual_brief=visual_brief_clean,
                status=status_clean,
                schedule=schedule,
                created_by_clerk_user_id=user_id,
            )
            session.add(row)
            session.flush()
            session.add(InstagramItemPage(instagram_item_id=row.id, sort_order=0))
            session.commit()
            return item_to_gql(reload_item_with_pages(session, row.id))
