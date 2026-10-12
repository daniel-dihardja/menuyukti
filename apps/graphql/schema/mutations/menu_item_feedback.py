"""Mutations: guest submit + owner reply/publish/hide for menu item feedback."""

from __future__ import annotations

import strawberry

import graphql.services.menu_item_feedback as feedback_svc
from graphql.context import request_session_scope
from graphql.data_sources.models.menu_item_feedback import (
    FEEDBACK_STATUS_HIDDEN,
    FEEDBACK_STATUS_PUBLISHED,
)
from graphql.schema.auth import user_id_from_info
from graphql.schema.mappers.menu_item_feedback import feedback_to_gql
from graphql.schema.types.menu_item_feedback import (
    MenuItemFeedbackSentiment,
    MenuItemFeedbackType,
)


@strawberry.type
class MenuItemFeedbackMutations:
    @strawberry.mutation(
        description=(
            "Authenticated guest: leave feedback on a published digital-menu item. "
            "Creates a pending note for owner moderation. Optional posOrderId links "
            "the note to a digital-menu order the guest opened."
        )
    )
    def submit_menu_item_feedback(
        self,
        info: strawberry.Info,
        location_id: int,
        menu_item_id: int,
        body: str,
        sentiment: MenuItemFeedbackSentiment | None = None,
        guest_display_name: str | None = None,
        pos_order_id: int | None = None,
    ) -> MenuItemFeedbackType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for submitMenuItemFeedback")
        with request_session_scope(info) as session:
            view = feedback_svc.submit_feedback(
                session,
                clerk_user_id=user_id,
                location_id=location_id,
                menu_item_id=menu_item_id,
                sentiment=sentiment.value if sentiment is not None else None,
                body=body,
                guest_display_name=guest_display_name,
                pos_order_id=pos_order_id,
            )
            session.commit()
            return feedback_to_gql(view)

    @strawberry.mutation(
        description="Location owner: save a reply on a feedback note."
    )
    def reply_menu_item_feedback(
        self,
        info: strawberry.Info,
        feedback_id: int,
        reply: str,
    ) -> MenuItemFeedbackType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for replyMenuItemFeedback")
        with request_session_scope(info) as session:
            view = feedback_svc.reply_to_feedback(
                session,
                feedback_id=feedback_id,
                clerk_user_id=user_id,
                reply=reply,
            )
            session.commit()
            return feedback_to_gql(view)

    @strawberry.mutation(
        description="Location owner: publish a feedback note on the public menu item."
    )
    def publish_menu_item_feedback(
        self,
        info: strawberry.Info,
        feedback_id: int,
    ) -> MenuItemFeedbackType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for publishMenuItemFeedback")
        with request_session_scope(info) as session:
            view = feedback_svc.set_feedback_status(
                session,
                feedback_id=feedback_id,
                clerk_user_id=user_id,
                status=FEEDBACK_STATUS_PUBLISHED,
            )
            session.commit()
            return feedback_to_gql(view)

    @strawberry.mutation(
        description="Location owner: hide a feedback note from the public menu."
    )
    def hide_menu_item_feedback(
        self,
        info: strawberry.Info,
        feedback_id: int,
    ) -> MenuItemFeedbackType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for hideMenuItemFeedback")
        with request_session_scope(info) as session:
            view = feedback_svc.set_feedback_status(
                session,
                feedback_id=feedback_id,
                clerk_user_id=user_id,
                status=FEEDBACK_STATUS_HIDDEN,
            )
            session.commit()
            return feedback_to_gql(view)
