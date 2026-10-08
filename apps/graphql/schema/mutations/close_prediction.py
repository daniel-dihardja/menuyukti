"""Owner mutation: close voting on a prediction."""

from __future__ import annotations

import strawberry

from graphql.context import request_session_scope
from graphql.data_sources.models.prediction import Prediction
from graphql.schema.auth import require_location_owner, user_id_from_info
from graphql.schema.queries.predictions import prediction_to_gql
from graphql.schema.types.prediction import PredictionType
from graphql.services import predictions as pred_svc


@strawberry.type
class ClosePredictionMutation:
    @strawberry.mutation(
        description=(
            "Close voting on a prediction without resolving. Requires location ownership "
            "and an active prediction subscription."
        )
    )
    def close_prediction(
        self,
        info: strawberry.Info,
        prediction_id: int,
    ) -> PredictionType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for closePrediction")
        with request_session_scope(info) as session:
            row = session.get(Prediction, prediction_id)
            if row is None:
                raise ValueError("Prediction not found")
            require_location_owner(session, int(row.location_id), user_id, info=info)
            view = pred_svc.close_prediction(
                session,
                prediction_id=prediction_id,
                location_id=int(row.location_id),
            )
            session.commit()
            return prediction_to_gql(view)
