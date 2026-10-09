"""Owner mutation: create a voting for a location."""

from __future__ import annotations

import strawberry

import graphql.services.votings as voting_svc
from graphql.context import request_session_scope
from graphql.schema.auth import require_location_owner, user_id_from_info
from graphql.schema.queries.votings import voting_to_gql
from graphql.schema.types.voting import CreateVotingInput, VotingType


@strawberry.type
class CreateVotingMutation:
    @strawberry.mutation(
        description=(
            "Create a voting for a location. Requires location ownership and an "
            "active voting subscription. reward_mode=points also requires point_system."
        )
    )
    def create_voting(
        self,
        info: strawberry.Info,
        input: CreateVotingInput,
    ) -> VotingType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for createVoting")
        with request_session_scope(info) as session:
            require_location_owner(session, input.location_id, user_id, info=info)
            view = voting_svc.create_voting(
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
            return voting_to_gql(view)
