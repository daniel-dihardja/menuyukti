"""GraphQL types for location-scoped voting polls."""

from __future__ import annotations

from datetime import datetime

import strawberry


@strawberry.type(description="One option on a voting.")
class VotingOptionType:
    id: int
    label: str
    sort_order: int


@strawberry.type(description="A guest's vote on a voting.")
class VotingVoteType:
    id: int
    option_id: int
    clerk_user_id: str
    created_at: datetime


@strawberry.type(description="A location voting guests can vote on.")
class VotingType:
    id: int
    location_id: int
    location_name: str
    question: str
    status: str
    closes_at: datetime | None
    reward_mode: str
    points_for_vote: int
    points_for_correct: int
    winning_option_id: int | None
    created_at: datetime
    resolved_at: datetime | None
    options: list[VotingOptionType]
    my_vote: VotingVoteType | None
    vote_count: int


@strawberry.input(description="Create a voting for a location.")
class CreateVotingInput:
    location_id: int
    question: str
    options: list[str]
    reward_mode: str = "points"
    points_for_vote: int = 0
