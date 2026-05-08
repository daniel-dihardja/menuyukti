"""State schema for dedicated promotion-candidates milestone execution."""

from __future__ import annotations

from typing import Any, NotRequired, TypedDict


class PromotionCandidatesCategory(TypedDict):
    category: str
    starItems: list[str]
    puzzleItems: list[str]


class PromotionCandidatesOutput(TypedDict):
    mainCategory: str
    categories: list[PromotionCandidatesCategory]
    sourceAnalyticsRunId: str | None
    notes: str


class PromotionCandidatesState(TypedDict):
    """State carried through deterministic promotion-candidates generation and persistence."""

    milestone_id: str
    location_id: int
    user_id: str
    goal: str
    criteria: list[dict[str, str]]
    milestone_input: NotRequired[dict[str, Any] | None]
    run_id: NotRequired[str]
    traceparent: NotRequired[str | None]
    prior_milestones_data: NotRequired[str]
    promotion_candidates: NotRequired[dict[str, Any] | None]
    campaign_brief_main_category: NotRequired[str]
    formatted_output: NotRequired[PromotionCandidatesOutput | None]
    result_data: str
    milestone_data: NotRequired[dict[str, Any] | list[Any] | None]
    milestonedata_written: bool
