"""Milestone-run output schemas for runtime validation at write boundary."""

from __future__ import annotations

import re
from typing import Any, Literal

from pydantic import BaseModel, ValidationError, field_validator, model_validator


class CampaignWindowPublicHoliday(BaseModel):
    name: str
    description: str
    date: str


class DatesMilestoneOutput(BaseModel):
    startDate: str
    endDate: str
    publicHolidays: list[CampaignWindowPublicHoliday]


class CampaignBriefVenueSnapshot(BaseModel):
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
            raise ValueError(
                "must contain location identity only; campaign/date text is not allowed"
            )
        return cleaned


class CampaignBriefMilestoneOutput(BaseModel):
    startDate: str
    endDate: str
    publicHolidays: list[CampaignWindowPublicHoliday]
    venueSnapshot: CampaignBriefVenueSnapshot
    contentPillars: list[str]
    audienceHypotheses: list[str]
    proofOrientedAngles: list[str]
    toneGuardrails: list[str]
    campaignObjective: str
    targetSegments: list[str]
    messageHierarchy: list[str]
    offerAndCtaPlan: list[str]
    contentPillarPlan: list[str]
    measurementPlan: list[str]
    testingPlan: list[str]
    riskGuardrails: list[str]

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
            "targetSegments",
            "messageHierarchy",
            "offerAndCtaPlan",
            "contentPillarPlan",
            "measurementPlan",
            "testingPlan",
            "riskGuardrails",
        ):
            data[key] = cls._normalize_unique(data.get(key, []))
        return data

    @field_validator(
        "contentPillars",
        "audienceHypotheses",
        "proofOrientedAngles",
        "toneGuardrails",
        "targetSegments",
        "messageHierarchy",
        "offerAndCtaPlan",
        "contentPillarPlan",
        "measurementPlan",
        "testingPlan",
        "riskGuardrails",
    )
    @classmethod
    def _validate_list_quality(cls, values: list[str]) -> list[str]:
        if not (3 <= len(values) <= 5):
            raise ValueError("must contain between 3 and 5 unique non-empty items")
        return values

    @field_validator("campaignObjective")
    @classmethod
    def _validate_campaign_objective(cls, value: str) -> str:
        text = value.strip()
        if not text:
            raise ValueError("campaignObjective must be non-empty")
        return text


class PostSchedulerMonthlyArcWeek(BaseModel):
    week: Literal[1, 2, 3, 4]
    objective: str
    rationale: str


class PostSchedulerMonthlyArc(BaseModel):
    weeks: list[PostSchedulerMonthlyArcWeek]

    @field_validator("weeks")
    @classmethod
    def _validate_week_coverage(cls, values: list[PostSchedulerMonthlyArcWeek]) -> list[PostSchedulerMonthlyArcWeek]:
        if len(values) != 4:
            raise ValueError("must include exactly 4 week objectives")
        weeks = sorted(item.week for item in values)
        if weeks != [1, 2, 3, 4]:
            raise ValueError("weeks must include 1,2,3,4 exactly once")
        return values


class PostSchedulerContentRatioItem(BaseModel):
    pillar: str
    percent: int
    reason: str


class PostSchedulerContentRatio(BaseModel):
    pillars: list[PostSchedulerContentRatioItem]

    @field_validator("pillars")
    @classmethod
    def _validate_ratio_sum(cls, values: list[PostSchedulerContentRatioItem]) -> list[PostSchedulerContentRatioItem]:
        if sum(item.percent for item in values) != 100:
            raise ValueError("contentRatio percent total must equal 100")
        return values


class PostSchedulerFormatMixItem(BaseModel):
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


class PostSchedulerFormatMix(BaseModel):
    formats: list[PostSchedulerFormatMixItem]

    @field_validator("formats")
    @classmethod
    def _validate_formats(cls, values: list[PostSchedulerFormatMixItem]) -> list[PostSchedulerFormatMixItem]:
        required = {
            "Reels",
            "Carousels",
            "Single posts",
            "Stories",
            "Highlights updates",
            "Lives",
            "Collaborator posts",
        }
        present = {item.format for item in values}
        if present != required:
            raise ValueError("formatMix must include each required format exactly once")
        return values


class PostSchedulerWeeklySlot(BaseModel):
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


class PostSchedulerMilestoneOutput(BaseModel):
    monthlyArc: PostSchedulerMonthlyArc
    contentRatio: PostSchedulerContentRatio
    formatMix: PostSchedulerFormatMix
    weeklySlotPlan: list[PostSchedulerWeeklySlot]
    guardrailCheck: str

    @model_validator(mode="after")
    def _validate_guardrails(self) -> "PostSchedulerMilestoneOutput":
        promo_counts: dict[int, int] = {1: 0, 2: 0, 3: 0, 4: 0}
        save_per_week: dict[int, bool] = {1: False, 2: False, 3: False, 4: False}
        cta_set: set[str] = set()
        has_week4_loyalty = False

        for slot in self.weeklySlotPlan:
            if slot.format == "Single post":
                promo_counts[slot.week] += 1
            if slot.format == "Carousel" or slot.ctaType == "Save":
                save_per_week[slot.week] = True
            cta_set.add(slot.ctaType)
            if slot.week == 4 and slot.funnelStage == "Loyalty":
                has_week4_loyalty = True

        if any(count > 2 for count in promo_counts.values()):
            raise ValueError("no more than 2 promotional posts are allowed per week")
        if not all(save_per_week.values()):
            raise ValueError("at least one save-optimized post is required per week")
        if len(cta_set) < 2:
            raise ValueError("CTA types must vary across the month")
        if not has_week4_loyalty:
            raise ValueError("week 4 must include at least one loyalty/community post")

        return self


_SKILL_SCHEMA_REGISTRY: dict[str, type[BaseModel]] = {
    "public_holidays": DatesMilestoneOutput,
    "dates": DatesMilestoneOutput,
    "campaign_brief": CampaignBriefMilestoneOutput,
    "post_scheduler": PostSchedulerMilestoneOutput,
}

def validate_skill_output(skill_id: str | None, payload: Any) -> tuple[Any | None, str | None]:
    """Validate output for registered skills; pass through for unknown skills."""
    if skill_id is None:
        return payload, None

    schema = _SKILL_SCHEMA_REGISTRY.get(skill_id)
    if schema is None:
        return payload, None

    try:
        validated = schema.model_validate(payload)
    except ValidationError as exc:
        first = exc.errors(include_url=False)[0]
        loc = ".".join(str(part) for part in first.get("loc", ()))
        msg = str(first.get("msg", "validation failed"))
        if loc:
            return None, f"[{skill_id}] {loc}: {msg}"
        return None, f"[{skill_id}] {msg}"

    return validated.model_dump(exclude_none=True), None
