"""Milestone-run output schemas for runtime validation at write boundary."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, ValidationError


class DatesPublicHoliday(BaseModel):
    name: str
    description: str
    date: str


class DatesMilestoneOutput(BaseModel):
    startDate: str
    endDate: str
    publicHolidays: list[DatesPublicHoliday]


class BrandBriefVenueSnapshot(BaseModel):
    venueName: str
    city: str
    country: str
    currency: str


class BrandBriefMilestoneOutput(BaseModel):
    venueSnapshot: BrandBriefVenueSnapshot
    contentPillars: list[str]
    audienceHypotheses: list[str]
    proofOrientedAngles: list[str]
    toneGuardrails: list[str]


class PromotionInstagramPromotion(BaseModel):
    angle: str
    format: str
    cta: str
    timing: str


class PromotionCandidateItem(BaseModel):
    menu: str
    rationale: list[str]
    puzzleAnalysis: str | None = None
    instagramPromotion: PromotionInstagramPromotion | None = None


class PromotionPuzzleOpportunityPool(BaseModel):
    puzzleItemsFound: int
    threshold: float
    selectedCount: int


class PromotionCandidatesContext(BaseModel):
    campaignWindowNotes: str | None = None
    brandBriefAlignmentNotes: str | None = None


class PromotionRankedCandidate(BaseModel):
    model_config = ConfigDict(extra="allow")

    menu: str
    recommendation: str
    score: float
    quantity: int
    totalRevenue: float
    signalReasons: list[str]


class PromotionCandidatesMilestoneOutput(BaseModel):
    placement: str
    puzzleOpportunityPool: PromotionPuzzleOpportunityPool
    promotionCandidates: list[PromotionCandidateItem]
    rankedCandidates: list[PromotionRankedCandidate]
    context: PromotionCandidatesContext | None = None


class SchedulerScheduleRow(BaseModel):
    dateTime: str
    type: Literal["single", "carousel"]
    promotedMenuItems: list[str]
    visualIdea: str
    captionIdea: str


class SchedulerMilestoneOutput(BaseModel):
    schedules: list[SchedulerScheduleRow]


_SKILL_SCHEMA_REGISTRY: dict[str, type[BaseModel]] = {
    "public_holidays": DatesMilestoneOutput,
    "dates": DatesMilestoneOutput,
    "brand_brief": BrandBriefMilestoneOutput,
    "promotion_candidates": PromotionCandidatesMilestoneOutput,
    "scheduler": SchedulerMilestoneOutput,
}


def validate_skill_output(
    skill_id: str | None, payload: Any
) -> tuple[Any | None, str | None]:
    """Validate output for registered skills; pass through for unknown skills."""
    if skill_id is None:
        return payload, None

    schema = _SKILL_SCHEMA_REGISTRY.get(skill_id)
    if schema is None:
        return payload, None

    try:
        validated = schema.model_validate(payload)
    except ValidationError as exc:
        first_error = exc.errors(include_url=False)[0]["msg"]
        return None, f"[{skill_id}] {first_error}"

    return validated.model_dump(exclude_none=True), None


def validate_scheduler_output(payload: Any) -> tuple[Any | None, str | None]:
    """Backward-compatible scheduler validator wrapper."""
    return validate_skill_output("scheduler", payload)
