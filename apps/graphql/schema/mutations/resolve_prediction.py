"""Owner mutation: resolve a prediction and optionally award points."""

from __future__ import annotations

import strawberry

import graphql.services.predictions as pred_svc
from graphql.context import request_session_scope
from graphql.data_sources.models.prediction import Prediction
from graphql.schema.auth import require_location_owner, user_id_from_info
from graphql.schema.queries.predictions import prediction_to_gql
from graphql.schema.types.prediction import PredictionType


@strawberry.type
class ResolvePredictionMutation:
    @strawberry.mutation(
        description=(
            "Mark the winning outcome and resolve the prediction. "
            "When reward_mode is points, awards correct voters via the point ledger. "
            "Requires location ownership and an active prediction subscription."
        )
    )
    def resolve_prediction(
        self,
        info: strawberry.Info,
        prediction_id: int,
        winning_outcome_id: int,
    ) -> PredictionType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for resolvePrediction")
        with request_session_scope(info) as session:
            row = session.get(Prediction, prediction_id)
            if row is None:
                raise ValueError("Prediction not found")
            require_location_owner(session, int(row.location_id), user_id, info=info)
            view = pred_svc.resolve_prediction(
                session,
                prediction_id=prediction_id,
                location_id=int(row.location_id),
                winning_outcome_id=winning_outcome_id,
            )
            session.commit()
            return prediction_to_gql(view)
