"""GraphQL types for location-scoped prediction games."""

from __future__ import annotations

from datetime import datetime

import strawberry


@strawberry.type(description="One outcome option on a prediction.")
class PredictionOutcomeType:
    id: int
    label: str
    sort_order: int


@strawberry.type(description="A guest's vote on a prediction.")
class PredictionVoteType:
    id: int
    outcome_id: int
    clerk_user_id: str
    created_at: datetime


@strawberry.type(description="A location prediction guests can vote on.")
class PredictionType:
    id: int
    location_id: int
    location_name: str
    question: str
    status: str
    closes_at: datetime
    reward_mode: str
    points_for_vote: int
    points_for_correct: int
    winning_outcome_id: int | None
    created_at: datetime
    resolved_at: datetime | None
    outcomes: list[PredictionOutcomeType]
    my_vote: PredictionVoteType | None
    vote_count: int


@strawberry.input(description="Create a prediction for a location.")
class CreatePredictionInput:
    location_id: int
    question: str
    closes_at: datetime
    outcomes: list[str]
    reward_mode: str = "social"
    points_for_vote: int = 0
    points_for_correct: int = 0
