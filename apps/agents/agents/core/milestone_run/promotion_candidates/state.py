"""State schema for dedicated promotion-candidates milestone execution."""

from __future__ import annotations

from typing import Any, Literal, NotRequired, TypedDict


class PromotionCandidatesCategory(TypedDict):
    menuCategory: str
    starHighlights: list[str]
    puzzleHighlights: list[str]
    notes: NotRequired[str]


class PromotionCandidatesOutput(TypedDict):
    grouping: Literal["by_menu_category", "flat"]
    categories: dict[str, PromotionCandidatesCategory]
    flatSummary: str
    promotionIdeas: list[str]


class PromotionCandidatesState(TypedDict):
    """State carried through dedicated promotion-candidates generation and persistence."""

    milestone_id: str
    location_id: int
    user_id: str
    goal: str
    criteria: list[dict[str, str]]
    milestone_input: NotRequired[dict[str, Any] | None]
    run_id: NotRequired[str]
    traceparent: NotRequired[str | None]
    prior_milestones_data: NotRequired[str]
    injected_prior_context_markdown: NotRequired[str]
    analytics_run: NotRequired[dict[str, Any] | None]
    promotion_candidates_raw: NotRequired[dict[str, Any] | None]
    owner_notes_markdown: NotRequired[str]
    generation_context_markdown: NotRequired[str]
    generated_output: NotRequired[PromotionCandidatesOutput | None]
    result_data: str
    milestone_data: NotRequired[dict[str, Any] | list[Any] | None]
    milestonedata_written: bool
