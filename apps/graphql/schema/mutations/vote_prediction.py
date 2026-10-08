"""Guest mutation: cast a vote on an open prediction."""

from __future__ import annotations

import strawberry

from graphql.context import request_session_scope
from graphql.schema.auth import user_id_from_info
from graphql.schema.queries.predictions import prediction_to_gql
from graphql.schema.types.prediction import PredictionType
from graphql.services import predictions as pred_svc


@strawberry.type
class VotePredictionMutation:
    @strawberry.mutation(
        description=(
            "Cast one vote on an open prediction. Requires authenticated Clerk guest. "
            "When reward_mode is points and points_for_vote > 0, credits the guest "
            "if Point System is active."
        )
    )
    def vote_prediction(
        self,
        info: strawberry.Info,
        prediction_id: int,
        outcome_id: int,
    ) -> PredictionType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for votePrediction")
        with request_session_scope(info) as session:
            view = pred_svc.vote_prediction(
                session,
                clerk_user_id=user_id,
                prediction_id=prediction_id,
                outcome_id=outcome_id,
            )
            session.commit()
            return prediction_to_gql(view)
