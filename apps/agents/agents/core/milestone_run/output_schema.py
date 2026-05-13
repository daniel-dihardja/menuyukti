"""Milestone-run output schemas for runtime validation at write boundary."""

from __future__ import annotations

import re
from typing import Any, Literal

from pydantic import BaseModel, Field, ValidationError, field_validator, model_validator


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
    venueSnapshot: CampaignBriefVenueSnapshot
    contentPillars: list[str]
    audienceHypotheses: list[str]
    proofOrientedAngles: list[str]
    toneGuardrails: list[str]
    campaignObjective: str
    mainCategory: str
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

    @field_validator("mainCategory")
    @classmethod
    def _validate_main_category(cls, value: str) -> str:
        text = value.strip()
        if not text:
            raise ValueError("mainCategory must be a non-empty POS menu category name")
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
    def _validate_guardrails(self) -> PostSchedulerMilestoneOutput:
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


class PromotionCandidateMenuItem(BaseModel):
    """Star or puzzle menu line with optional storytelling judgment vs campaign brief."""

    name: str
    storytellingFit: Literal["strong", "weak"] = "weak"
    storytellingRationale: str = ""
    quantity: int | None = None
    popularity: float | None = None
    priceLevel: Literal[1, 2, 3] | None = None

    @field_validator("name", mode="before")
    @classmethod
    def _normalize_name(cls, value: Any) -> str:
        return str(value or "").strip()

    @field_validator("name")
    @classmethod
    def _require_name(cls, value: str) -> str:
        if not value:
            raise ValueError("name must be non-empty")
        return value

    @field_validator("storytellingFit", mode="before")
    @classmethod
    def _normalize_fit(cls, value: Any) -> str:
        text = str(value or "").strip().lower()
        if text == "strong":
            return "strong"
        return "weak"

    @field_validator("storytellingRationale", mode="before")
    @classmethod
    def _normalize_rationale(cls, value: Any) -> str:
        return str(value or "").strip()

    @field_validator("quantity", mode="before")
    @classmethod
    def _normalize_quantity(cls, value: Any) -> int | None:
        if value is None or value == "":
            return None
        qty = int(value)
        if qty < 0:
            raise ValueError("quantity must be non-negative")
        return qty

    @field_validator("popularity", mode="before")
    @classmethod
    def _normalize_popularity(cls, value: Any) -> float | None:
        if value is None or value == "":
            return None
        score = float(value)
        if score < 0.0 or score > 1.0:
            raise ValueError("popularity must be between 0 and 1")
        return score

    @field_validator("priceLevel", mode="before")
    @classmethod
    def _normalize_price_level(cls, value: Any) -> int | None:
        if value is None or value == "":
            return None
        level = int(value)
        if level not in (1, 2, 3):
            raise ValueError("priceLevel must be 1, 2, or 3")
        return level


class PromotionCandidatesCategory(BaseModel):
    category: str
    starItems: list[PromotionCandidateMenuItem] = Field(default_factory=list)
    puzzleItems: list[PromotionCandidateMenuItem] = Field(default_factory=list)

    @field_validator("category")
    @classmethod
    def _validate_category(cls, value: str) -> str:
        text = value.strip()
        if not text:
            raise ValueError("category must be non-empty")
        return text

    @field_validator("starItems", "puzzleItems", mode="before")
    @classmethod
    def _coerce_legacy_string_items(cls, value: Any) -> Any:
        if not isinstance(value, list):
            return []
        normalized: list[dict[str, Any]] = []
        for raw in value:
            if isinstance(raw, str):
                name = raw.strip()
                if not name:
                    continue
                normalized.append(
                    {
                        "name": name,
                        "storytellingFit": "strong",
                        "storytellingRationale": "",
                    }
                )
            elif isinstance(raw, dict):
                normalized.append(dict(raw))
        return normalized


class PromotionCandidatesMilestoneOutput(BaseModel):
    mainCategory: str
    categories: list[PromotionCandidatesCategory]

    @field_validator("mainCategory")
    @classmethod
    def _validate_main_category(cls, value: str) -> str:
        text = value.strip()
        if not text:
            raise ValueError("mainCategory must be a non-empty POS menu category name")
        return text
    sourceAnalyticsRunId: str | None = None
    notes: str | None = None

    @field_validator("categories")
    @classmethod
    def _validate_categories(cls, values: list[PromotionCandidatesCategory]) -> list[PromotionCandidatesCategory]:
        if not values:
            raise ValueError("categories must contain at least one category")
        seen = {row.category for row in values}
        if len(seen) != len(values):
            raise ValueError("categories must not contain duplicates")
        return values


class CultureHookIntersection(BaseModel):
    topic: str
    conceptLink: str
    audienceRelevance: str
    contentExample: str


class CultureHooksMilestoneOutput(BaseModel):
    locationConcept: str
    targetAudience: str
    intersections: list[CultureHookIntersection]
    guardrailCheck: str

    @field_validator("locationConcept", "targetAudience", "guardrailCheck")
    @classmethod
    def _validate_non_empty_summary_fields(cls, value: str) -> str:
        text = value.strip()
        if not text:
            raise ValueError("must be non-empty")
        return text

    @field_validator("intersections")
    @classmethod
    def _validate_intersections(cls, values: list[CultureHookIntersection]) -> list[CultureHookIntersection]:
        if not (3 <= len(values) <= 5):
            raise ValueError("must contain between 3 and 5 intersections")
        seen_topics: set[str] = set()
        for item in values:
            topic = item.topic.strip()
            if not topic:
                raise ValueError("intersection topic must be non-empty")
            key = topic.casefold()
            if key in seen_topics:
                raise ValueError("intersections must not contain duplicate topics")
            seen_topics.add(key)
        return values


FormatMixFormatKey = Literal["single_post", "carousel", "single_video_reel", "multi_video_reel"]


class FormatMixFormatItem(BaseModel):
    format: FormatMixFormatKey
    percent: int = Field(ge=0, le=100)


class FormatMixMilestoneOutput(BaseModel):
    formats: list[FormatMixFormatItem] = Field(default_factory=list)


_IG_USERNAME_RE = re.compile(r"^[a-zA-Z0-9._]+$")


class IgProfileUsernameSuggestion(BaseModel):
    username: str
    rationale: str

    @field_validator("username")
    @classmethod
    def _validate_username(cls, value: str) -> str:
        cleaned = value.strip().lstrip("@")
        if not cleaned:
            raise ValueError("username must be non-empty")
        if len(cleaned) > 30:
            raise ValueError("username must be at most 30 characters")
        if not _IG_USERNAME_RE.fullmatch(cleaned):
            raise ValueError(
                "username may only contain letters, numbers, periods, and underscores"
            )
        return cleaned

    @field_validator("rationale")
    @classmethod
    def _validate_rationale(cls, value: str) -> str:
        text = value.strip()
        if not text:
            raise ValueError("rationale must be non-empty")
        return text


class IgProfileBio(BaseModel):
    text: str
    hook: str
    valueProp: str
    cta: str
    tone: str

    @field_validator("text")
    @classmethod
    def _validate_bio_text(cls, value: str) -> str:
        text = value.strip()
        if not text:
            raise ValueError("bio text must be non-empty")
        if len(text) > 150:
            raise ValueError("bio text must be at most 150 characters")
        return text

    @field_validator("hook", "valueProp", "cta", "tone")
    @classmethod
    def _validate_breakdown_fields(cls, value: str) -> str:
        text = value.strip()
        if not text:
            raise ValueError("must be non-empty")
        return text


class IgProfileMilestoneOutput(BaseModel):
    usernames: list[IgProfileUsernameSuggestion]
    bios: list[IgProfileBio]

    @field_validator("bios")
    @classmethod
    def _validate_bios(cls, values: list[IgProfileBio]) -> list[IgProfileBio]:
        if len(values) != 3:
            raise ValueError("must contain exactly 3 bio variations")
        return values

    @field_validator("usernames")
    @classmethod
    def _validate_usernames(
        cls, values: list[IgProfileUsernameSuggestion]
    ) -> list[IgProfileUsernameSuggestion]:
        if not (3 <= len(values) <= 5):
            raise ValueError("must contain between 3 and 5 username suggestions")
        seen: set[str] = set()
        for item in values:
            key = item.username.casefold()
            if key in seen:
                raise ValueError("usernames must not contain duplicates")
            seen.add(key)
        return values


class MenuTaggerTagsOutput(BaseModel):
    kind: Literal["food", "drink", "other"]
    ingredient: list[str] = Field(default_factory=list)
    taste: list[str] = Field(default_factory=list)
    course: list[str] = Field(default_factory=list)


class MenuTaggerItemOutput(BaseModel):
    name: str
    role: Literal["star", "puzzle"]
    category: str
    tags: MenuTaggerTagsOutput


class MenuTaggerUsedTagsOutput(BaseModel):
    kind: list[str] = Field(default_factory=list)
    ingredient: list[str] = Field(default_factory=list)
    taste: list[str] = Field(default_factory=list)
    course: list[str] = Field(default_factory=list)


class MenuTaggerMilestoneOutput(BaseModel):
    taxonomyVersion: Literal["v1"]
    sourcePromotionCandidatesTitle: str | None = None
    items: list[MenuTaggerItemOutput]
    usedTags: MenuTaggerUsedTagsOutput
    notes: str | None = None

    @field_validator("items")
    @classmethod
    def _validate_items(cls, values: list[MenuTaggerItemOutput]) -> list[MenuTaggerItemOutput]:
        if not values:
            raise ValueError("must contain at least one tagged item")
        seen: set[tuple[str, str, str]] = set()
        for item in values:
            name = item.name.strip()
            if not name:
                raise ValueError("item name must be non-empty")
            category = item.category.strip() or "(uncategorized)"
            key = (name.casefold(), item.role, category.casefold())
            if key in seen:
                raise ValueError("items must not contain duplicate name/role/category tuples")
            seen.add(key)
        return values


_SKILL_SCHEMA_REGISTRY: dict[str, type[BaseModel]] = {
    "public_holidays": DatesMilestoneOutput,
    "dates": DatesMilestoneOutput,
    "campaign_brief": CampaignBriefMilestoneOutput,
    "post_scheduler": PostSchedulerMilestoneOutput,
    "promotion_candidates": PromotionCandidatesMilestoneOutput,
    "menu_tagger": MenuTaggerMilestoneOutput,
    "culture_hooks": CultureHooksMilestoneOutput,
    "format_mix": FormatMixMilestoneOutput,
    "ig_profile": IgProfileMilestoneOutput,
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
