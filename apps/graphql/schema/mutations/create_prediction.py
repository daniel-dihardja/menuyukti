"""Owner mutation: create a prediction for a location."""

from __future__ import annotations

import strawberry

from graphql.context import request_session_scope
from graphql.schema.auth import require_location_owner, user_id_from_info
from graphql.schema.queries.predictions import prediction_to_gql
from graphql.schema.types.prediction import CreatePredictionInput, PredictionType
from graphql.services import predictions as pred_svc


@strawberry.type
class CreatePredictionMutation:
    @strawberry.mutation(
        description=(
            "Create a prediction for a location. Requires location ownership and an "
            "active prediction subscription. reward_mode=points also requires point_system."
        )
    )
    def create_prediction(
        self,
        info: strawberry.Info,
        input: CreatePredictionInput,
    ) -> PredictionType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for createPrediction")
        with request_session_scope(info) as session:
            require_location_owner(session, input.location_id, user_id, info=info)
            view = pred_svc.create_prediction(
                session,
                location_id=input.location_id,
                question=input.question,
                closes_at=input.closes_at,
                outcome_labels=list(input.outcomes),
                reward_mode=input.reward_mode,
                points_for_vote=input.points_for_vote,
                points_for_correct=input.points_for_correct,
            )
            session.commit()
            return prediction_to_gql(view)
