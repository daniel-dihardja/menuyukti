"""Owner and guest voting queries."""

from __future__ import annotations

import strawberry

import graphql.services.votings as voting_svc
from graphql.context import request_session_scope
from graphql.schema.auth import is_location_owner, user_id_from_info
from graphql.schema.types.voting import (
    VotingOptionType,
    VotingType,
    VotingVoteType,
)


def _vote_to_gql(vote: voting_svc.VoteView) -> VotingVoteType:
    return VotingVoteType(
        id=vote.id,
        option_id=vote.option_id,
        clerk_user_id=vote.clerk_user_id,
        created_at=vote.created_at,
    )


def voting_to_gql(view: voting_svc.VotingView) -> VotingType:
    return VotingType(
        id=view.id,
        location_id=view.location_id,
        location_name=view.location_name,
        question=view.question,
        status=view.status,
        closes_at=view.closes_at,
        reward_mode=view.reward_mode,
        points_for_vote=view.points_for_vote,
        points_for_correct=view.points_for_correct,
        winning_option_id=view.winning_option_id,
        created_at=view.created_at,
        resolved_at=view.resolved_at,
        options=[
            VotingOptionType(
                id=o.id,
                label=o.label,
                sort_order=o.sort_order,
            )
            for o in view.options
        ],
        my_vote=_vote_to_gql(view.my_vote) if view.my_vote else None,
        vote_count=view.vote_count,
    )


@strawberry.type
class VotingsQuery:
    @strawberry.field(
        description=(
            "List votings for a location. Requires location ownership. "
            "Empty when unauthenticated or not an owner."
        )
    )
    def votings(
        self,
        info: strawberry.Info,
        location_id: int,
    ) -> list[VotingType]:
        user_id = user_id_from_info(info)
        if not user_id:
            return []
        with request_session_scope(info) as session:
            if not is_location_owner(session, location_id, user_id, info=info):
                return []
            return [
                voting_to_gql(view)
                for view in voting_svc.list_votings_for_location(session, location_id)
            ]

    @strawberry.field(
        description=(
            "Open guest votings at locations the authenticated guest has visited "
            "(point ledger or digital-menu orders), with an active voting subscription. "
            "Closed votings are hidden. Empty when unauthenticated."
        )
    )
    def my_open_votings(self, info: strawberry.Info) -> list[VotingType]:
        user_id = user_id_from_info(info)
        if not user_id:
            return []
        with request_session_scope(info) as session:
            return [
                voting_to_gql(view)
                for view in voting_svc.list_open_votings_for_guest(session, clerk_user_id=user_id)
            ]
