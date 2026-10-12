"""Owner queries for menu item feedback inbox."""

from __future__ import annotations

import strawberry

import graphql.services.menu_item_feedback as feedback_svc
from graphql.context import request_session_scope
from graphql.schema.auth import user_id_from_info
from graphql.schema.mappers.menu_item_feedback import feedback_to_gql
from graphql.schema.types.menu_item_feedback import (
    MenuItemFeedbackStatus,
    MenuItemFeedbackType,
)


@strawberry.type
class MenuItemFeedbackQuery:
    @strawberry.field(
        description=(
            "Location owner: list menu item feedback for the digital menu inbox. "
            "Optional status filter. Returns empty when unauthenticated or not owner."
        )
    )
    def location_menu_item_feedbacks(
        self,
        info: strawberry.Info,
        location_id: int,
        status: MenuItemFeedbackStatus | None = None,
    ) -> list[MenuItemFeedbackType]:
        user_id = user_id_from_info(info)
        if not user_id:
            return []
        with request_session_scope(info) as session:
            try:
                views = feedback_svc.list_for_owner(
                    session,
                    location_id=location_id,
                    clerk_user_id=user_id,
                    status=status.value if status is not None else None,
                )
            except PermissionError:
                return []
            return [feedback_to_gql(view) for view in views]

    @strawberry.field(
        description="Location owner: count of pending (new) menu item feedback."
    )
    def location_menu_item_feedback_pending_count(
        self,
        info: strawberry.Info,
        location_id: int,
    ) -> int:
        user_id = user_id_from_info(info)
        if not user_id:
            return 0
        with request_session_scope(info) as session:
            try:
                return feedback_svc.count_pending_for_location(
                    session,
                    location_id=location_id,
                    clerk_user_id=user_id,
                )
            except PermissionError:
                return 0
