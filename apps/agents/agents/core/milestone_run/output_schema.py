"""Milestone-run output schemas for runtime validation at write boundary."""

from __future__ import annotations

import re
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, ValidationError, field_validator, model_validator


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

    @staticmethod
    def _contains_date_or_campaign_text(value: str) -> bool:
        text = value.strip().lower()
        if not text:
            return False

        forbidden_terms = ("start date", "end date", "campaign", "window")
        if any(term in text for term in forbidden_terms):
            return True

        # yyyy-mm-dd and dd/mm/yyyy-like patterns
        if re.search(r"\b\d{4}-\d{2}-\d{2}\b", text):
            return True
        if re.search(r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b", text):
            return True
        if re.search(
            r"\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s*[-/]\s*"
            r"(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{4}\b",
            text,
        ):
            return True
        return bool(re.search(r"\bq[1-4]\s+\d{4}\b", text))

    @field_validator("venueName", "city", "country", "currency")
    @classmethod
    def _validate_identity_fields(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            return cleaned
        if cls._contains_date_or_campaign_text(cleaned):
            raise ValueError("must contain location identity only; campaign/date text is not allowed")
        return cleaned


class BrandBriefMilestoneOutput(BaseModel):
    venueSnapshot: BrandBriefVenueSnapshot
    contentPillars: list[str]
    audienceHypotheses: list[str]
    proofOrientedAngles: list[str]
    toneGuardrails: list[str]

    @staticmethod
    def _normalize_unique(values: Any) -> list[str]:
        if not isinstance(values, list):
            return values
        seen: set[str] = set()
        normalized: list[str] = []
        for raw in values:
            text = str(raw).strip()
            if not text:
                continue
            key = text.casefold()
            if key in seen:
                continue
            seen.add(key)
            normalized.append(text)
        return normalized

    @model_validator(mode="before")
    @classmethod
    def _normalize_arrays(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        for key in (
            "contentPillars",
            "audienceHypotheses",
            "proofOrientedAngles",
            "toneGuardrails",
        ):
            data[key] = cls._normalize_unique(data.get(key, []))
        return data

    @field_validator(
        "contentPillars",
        "audienceHypotheses",
        "proofOrientedAngles",
        "toneGuardrails",
    )
    @classmethod
    def _validate_list_quality(cls, values: list[str]) -> list[str]:
        if not (3 <= len(values) <= 5):
            raise ValueError("must contain between 3 and 5 unique non-empty items")
        return values


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

    @model_validator(mode="after")
    def _promotion_candidates_nonempty_when_ranked_has_rows(self) -> PromotionCandidatesMilestoneOutput:
        if len(self.rankedCandidates) > 0 and len(self.promotionCandidates) == 0:
            msg = (
                "promotionCandidates must include at least one item when rankedCandidates is non-empty; "
                "build prioritized picks from rankedCandidates (or topPromote / puzzle selected) "
                "before calling write_result_data."
            )
            raise ValueError(msg)
        return self


class SchedulerScheduleRow(BaseModel):
    dateTime: str
    type: Literal["single", "carousel"]
    promotedMenuItems: list[str]
    visualIdea: str
    captionIdea: str


class SchedulerMilestoneOutput(BaseModel):
    schedules: list[SchedulerScheduleRow]
    campaignStart: str | None = None
    campaignEnd: str | None = None
    sourceSignalsSummary: str | None = None


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
