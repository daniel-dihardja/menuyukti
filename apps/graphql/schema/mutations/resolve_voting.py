"""Owner mutation: resolve a voting and optionally award points."""

from __future__ import annotations

import strawberry

import graphql.services.votings as voting_svc
from graphql.context import request_session_scope
from graphql.data_sources.models.voting import Voting
from graphql.schema.auth import require_location_owner, user_id_from_info
from graphql.schema.queries.votings import voting_to_gql
from graphql.schema.types.voting import VotingType


@strawberry.type
class ResolveVotingMutation:
    @strawberry.mutation(
        description=(
            "Mark the winning outcome and resolve the voting. "
            "When reward_mode is points, awards correct voters via the point ledger. "
            "Requires location ownership and an active voting subscription."
        )
    )
    def resolve_voting(
        self,
        info: strawberry.Info,
        voting_id: int,
        winning_outcome_id: int,
    ) -> VotingType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for resolveVoting")
        with request_session_scope(info) as session:
            row = session.get(Voting, voting_id)
            if row is None:
                raise ValueError("Voting not found")
            require_location_owner(session, int(row.location_id), user_id, info=info)
            view = voting_svc.resolve_voting(
                session,
                voting_id=voting_id,
                location_id=int(row.location_id),
                winning_outcome_id=winning_outcome_id,
            )
            session.commit()
            return voting_to_gql(view)
