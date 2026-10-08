"""Owner and guest prediction queries."""

from __future__ import annotations

import strawberry

import graphql.services.predictions as pred_svc
from graphql.context import request_session_scope
from graphql.schema.auth import is_location_owner, user_id_from_info
from graphql.schema.types.prediction import (
    PredictionOutcomeType,
    PredictionType,
    PredictionVoteType,
)


def _vote_to_gql(vote: pred_svc.VoteView) -> PredictionVoteType:
    return PredictionVoteType(
        id=vote.id,
        outcome_id=vote.outcome_id,
        clerk_user_id=vote.clerk_user_id,
        created_at=vote.created_at,
    )


def prediction_to_gql(view: pred_svc.PredictionView) -> PredictionType:
    return PredictionType(
        id=view.id,
        location_id=view.location_id,
        location_name=view.location_name,
        question=view.question,
        status=view.status,
        closes_at=view.closes_at,
        reward_mode=view.reward_mode,
        points_for_vote=view.points_for_vote,
        points_for_correct=view.points_for_correct,
        winning_outcome_id=view.winning_outcome_id,
        created_at=view.created_at,
        resolved_at=view.resolved_at,
        outcomes=[
            PredictionOutcomeType(
                id=o.id,
                label=o.label,
                sort_order=o.sort_order,
            )
            for o in view.outcomes
        ],
        my_vote=_vote_to_gql(view.my_vote) if view.my_vote else None,
        vote_count=view.vote_count,
    )


@strawberry.type
class PredictionsQuery:
    @strawberry.field(
        description=(
            "List predictions for a location. Requires location ownership. "
            "Empty when unauthenticated or not an owner."
        )
    )
    def predictions(
        self,
        info: strawberry.Info,
        location_id: int,
    ) -> list[PredictionType]:
        user_id = user_id_from_info(info)
        if not user_id:
            return []
        with request_session_scope(info) as session:
            if not is_location_owner(session, location_id, user_id, info=info):
                return []
            return [
                prediction_to_gql(view)
                for view in pred_svc.list_predictions_for_location(session, location_id)
            ]

    @strawberry.field(
        description=(
            "Open predictions at locations the authenticated guest has visited "
            "(point ledger or digital-menu orders), with an active prediction subscription. "
            "Empty when unauthenticated."
        )
    )
    def my_open_predictions(self, info: strawberry.Info) -> list[PredictionType]:
        user_id = user_id_from_info(info)
        if not user_id:
            return []
        with request_session_scope(info) as session:
            return [
                prediction_to_gql(view)
                for view in pred_svc.list_open_predictions_for_guest(session, clerk_user_id=user_id)
            ]
