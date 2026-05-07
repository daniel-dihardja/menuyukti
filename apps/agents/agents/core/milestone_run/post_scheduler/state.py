"""State schema for dedicated post-scheduler milestone execution."""

from __future__ import annotations

from typing import Any, Literal, NotRequired, TypedDict


class PostSchedulerMonthlyArcWeek(TypedDict):
    week: Literal[1, 2, 3, 4]
    objective: str
    rationale: str


class PostSchedulerMonthlyArc(TypedDict):
    weeks: list[PostSchedulerMonthlyArcWeek]


class PostSchedulerContentRatioItem(TypedDict):
    pillar: str
    percent: int
    reason: str


class PostSchedulerContentRatio(TypedDict):
    pillars: list[PostSchedulerContentRatioItem]


class PostSchedulerFormatMixItem(TypedDict):
    format: Literal[
        "Reels",
        "Carousels",
        "Single posts",
        "Stories",
        "Highlights updates",
        "Lives",
        "Collaborator posts",
    ]
    count: int
    reason: str


class PostSchedulerFormatMix(TypedDict):
    formats: list[PostSchedulerFormatMixItem]


class PostSchedulerWeeklySlot(TypedDict):
    week: Literal[1, 2, 3, 4]
    day: str
    format: Literal["Reel", "Carousel", "Single post"]
    pillar: str
    hook: str
    captionStructure: str
    ctaType: Literal["Reserve", "Order", "DM", "Walk in", "Save"]
    funnelStage: Literal["Awareness", "Consideration", "Conversion", "Loyalty"]
    visualDirection: str
    notes: str


class PostSchedulerOutput(TypedDict):
    monthlyArc: PostSchedulerMonthlyArc
    contentRatio: PostSchedulerContentRatio
    formatMix: PostSchedulerFormatMix
    weeklySlotPlan: list[PostSchedulerWeeklySlot]
    guardrailCheck: str


class PostSchedulerState(TypedDict):
    """State carried through dedicated post-scheduler generation and persistence."""

    milestone_id: str
    location_id: int
    user_id: str
    goal: str
    criteria: list[dict[str, str]]
    workflow_id: NotRequired[str | None]
    milestone_input: NotRequired[dict[str, Any] | None]
    run_id: NotRequired[str]
    traceparent: NotRequired[str | None]
    prior_milestones_data: NotRequired[str]
    injected_prior_context_markdown: NotRequired[str]
    scheduler_plan: NotRequired[dict[str, Any] | None]
    promotion_candidates: NotRequired[dict[str, Any] | None]
    owner_notes_markdown: NotRequired[str]
    generation_context_markdown: NotRequired[str]
    generated_output: NotRequired[PostSchedulerOutput | None]
    result_data: str
    milestone_data: NotRequired[dict[str, Any] | list[Any] | None]
    milestonedata_written: bool
