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


class PostSchedulerPostItem(BaseModel):
    dayOfWeek: str
    date: str
    time: str
    postType: Literal["Reel", "Post"]
    contentType: Literal["Carousel", "Single"]
    promotedMenuItems: list[str]
    captionIdea: str

    @field_validator("promotedMenuItems")
    @classmethod
    def _non_empty_menu_items(cls, values: list[str]) -> list[str]:
        cleaned = [str(x).strip() for x in values if str(x).strip()]
        if not cleaned:
            raise ValueError("must contain at least one promoted menu item")
        return cleaned


class PostSchedulerMilestoneOutput(BaseModel):
    posts: list[PostSchedulerPostItem]


class PromotionCandidatesCategoryOutput(BaseModel):
    menuCategory: str
    starHighlights: list[str]
    puzzleHighlights: list[str]
    notes: str | None = None

    @field_validator("starHighlights", "puzzleHighlights")
    @classmethod
    def _dedupe_non_empty(cls, values: list[str]) -> list[str]:
        seen: set[str] = set()
        out: list[str] = []
        for raw in values:
            text = str(raw).strip()
            if not text:
                continue
            key = text.casefold()
            if key in seen:
                continue
            seen.add(key)
            out.append(text)
        return out


class PromotionCandidatesMilestoneOutput(BaseModel):
    grouping: Literal["by_menu_category", "flat"]
    categories: dict[str, PromotionCandidatesCategoryOutput]
    flatSummary: str
    promotionIdeas: list[str]

    @field_validator("promotionIdeas")
    @classmethod
    def _validate_ideas(cls, values: list[str]) -> list[str]:
        seen: set[str] = set()
        cleaned: list[str] = []
        for raw in values:
            text = str(raw).strip()
            if not text:
                continue
            key = text.casefold()
            if key in seen:
                continue
            seen.add(key)
            cleaned.append(text)
        if len(cleaned) > 8:
            raise ValueError("must contain at most 8 unique non-empty items")
        return cleaned

    @model_validator(mode="after")
    def _check_shape_by_grouping(self) -> "PromotionCandidatesMilestoneOutput":
        if self.grouping == "flat":
            if self.categories:
                raise ValueError("categories must be empty when grouping is flat")
        elif not self.categories:
            raise ValueError("categories must be non-empty when grouping is by_menu_category")
        return self


_SKILL_SCHEMA_REGISTRY: dict[str, type[BaseModel]] = {
    "public_holidays": DatesMilestoneOutput,
    "dates": DatesMilestoneOutput,
    "campaign_brief": CampaignBriefMilestoneOutput,
    "promotion_candidates": PromotionCandidatesMilestoneOutput,
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
        first_error = exc.errors(include_url=False)[0]["msg"]
        return None, f"[{skill_id}] {first_error}"

    return validated.model_dump(exclude_none=True), None
