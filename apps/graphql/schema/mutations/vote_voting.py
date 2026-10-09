"""Guest mutation: cast a vote on an open voting."""

from __future__ import annotations

import strawberry

import graphql.services.votings as voting_svc
from graphql.context import request_session_scope
from graphql.schema.auth import user_id_from_info
from graphql.schema.queries.votings import voting_to_gql
from graphql.schema.types.voting import VotingType


@strawberry.type
class VoteVotingMutation:
    @strawberry.mutation(
        description=(
            "Cast one vote on an open voting. Requires authenticated Clerk guest. "
            "When reward_mode is points and points_for_vote > 0, credits the guest "
            "if Point System is active."
        )
    )
    def vote_voting(
        self,
        info: strawberry.Info,
        voting_id: int,
        outcome_id: int,
    ) -> VotingType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for voteVoting")
        with request_session_scope(info) as session:
            view = voting_svc.vote_voting(
                session,
                clerk_user_id=user_id,
                voting_id=voting_id,
                outcome_id=outcome_id,
            )
            session.commit()
            return voting_to_gql(view)
