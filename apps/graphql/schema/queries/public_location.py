"""Public (unauthenticated) location hub and venue predictions."""

from __future__ import annotations

import strawberry
from sqlalchemy import select

import graphql.services.predictions as pred_svc
import graphql.services.public_location as hub_svc
from graphql.context import request_session_scope
from graphql.data_sources import Location
from graphql.schema.auth import user_id_from_info
from graphql.schema.queries.predictions import prediction_to_gql
from graphql.schema.types.prediction import PredictionType
from graphql.schema.types.public_location import (
    PublicLocationPredictionTeaserType,
    PublicLocationServiceType,
    PublicLocationType,
)


def _hub_to_gql(view: hub_svc.PublicLocationView) -> PublicLocationType:
    teaser = None
    if view.prediction_teaser is not None:
        teaser = PublicLocationPredictionTeaserType(
            question=view.prediction_teaser.question,
            open_count=view.prediction_teaser.open_count,
        )
    return PublicLocationType(
        id=view.id,
        name=view.name,
        public_slug=view.public_slug,
        services=[
            PublicLocationServiceType(
                key=s.key,
                href_segment=s.href_segment,
                available=s.available,
            )
            for s in view.services
        ],
        header_image_filename=view.header_image_filename,
        workspace_id=strawberry.ID(view.workspace_id) if view.workspace_id else None,
        media_owner_clerk_user_id=view.media_owner_clerk_user_id,
        menu_dish_count=view.menu_dish_count,
        prediction_teaser=teaser,
    )


@strawberry.type
class PublicLocationQuery:
    @strawberry.field(
        description=(
            "Public location hub by slug. Returns null when the slug is unknown. "
            "No authentication required."
        )
    )
    def public_location(
        self,
        info: strawberry.Info,
        slug: str,
    ) -> PublicLocationType | None:
        with request_session_scope(info) as session:
            view = hub_svc.get_public_location(session, slug)
            if view is None:
                return None
            return _hub_to_gql(view)

    @strawberry.field(
        description=(
            "Guest-visible predictions for a public location slug when Prediction is active: "
            "open, closed (awaiting result), and recently resolved. "
            "Empty when the slug is unknown or Prediction is off. "
            "Includes myVote when the caller is authenticated."
        )
    )
    def public_location_predictions(
        self,
        info: strawberry.Info,
        slug: str,
    ) -> list[PredictionType]:
        cleaned = (slug or "").strip().lower()
        if not cleaned:
            return []
        user_id = user_id_from_info(info)
        with request_session_scope(info) as session:
            location = session.scalars(
                select(Location).where(Location.public_slug == cleaned)
            ).one_or_none()
            if location is None:
                return []
            return [
                prediction_to_gql(view)
                for view in pred_svc.list_open_predictions_for_location(
                    session,
                    location_id=int(location.id),
                    clerk_user_id=user_id,
                )
            ]
