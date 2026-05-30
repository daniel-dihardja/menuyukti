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


class CampaignBriefOverallStrategy(BaseModel):
    strategyFocus: str
    audiencePriority: list[str]
    coreMessage: str
    offerWindow: str
    cadenceGuidance: list[str]

    @staticmethod
    def _normalize_unique(values: Any) -> list[str]:
        if not isinstance(values, list):
            return []
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
        for key in ("audiencePriority", "cadenceGuidance"):
            data[key] = cls._normalize_unique(data.get(key, []))
        return data

    @field_validator("strategyFocus", "coreMessage", "offerWindow")
    @classmethod
    def _validate_non_empty_text(cls, value: str) -> str:
        text = value.strip()
        if not text:
            raise ValueError("must be non-empty")
        return text

    @field_validator("audiencePriority", "cadenceGuidance")
    @classmethod
    def _validate_list_quality(cls, values: list[str]) -> list[str]:
        if not (3 <= len(values) <= 5):
            raise ValueError("must contain between 3 and 5 unique non-empty items")
        return values


class CampaignBriefMilestoneOutput(BaseModel):
    venueSnapshot: CampaignBriefVenueSnapshot
    overallStrategy: CampaignBriefOverallStrategy | None = None
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
    def _validate_categories(
        cls, values: list[PromotionCandidatesCategory]
    ) -> list[PromotionCandidatesCategory]:
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
    def _validate_intersections(
        cls, values: list[CultureHookIntersection]
    ) -> list[CultureHookIntersection]:
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


_IG_USERNAME_RE = re.compile(r"^[a-zA-Z0-9._]+$")
IG_PROFILE_BIO_MAX_CHARS = 150


def clamp_ig_profile_bio_text(value: str, *, max_chars: int = IG_PROFILE_BIO_MAX_CHARS) -> str:
    """Trim and clamp Instagram bio copy to the platform character limit."""
    text = value.strip()
    if not text:
        return text
    if len(text) <= max_chars:
        return text
    truncated = text[:max_chars].rstrip()
    last_space = truncated.rfind(" ")
    if last_space >= max_chars - 30:
        word_boundary = truncated[:last_space].rstrip()
        if word_boundary:
            return word_boundary
    return truncated


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
            raise ValueError("username may only contain letters, numbers, periods, and underscores")
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
        text = clamp_ig_profile_bio_text(value)
        if not text:
            raise ValueError("bio text must be non-empty")
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
    reel_moment: str
    texture: list[str] = Field(default_factory=list)
    prep_style: list[str] = Field(default_factory=list)
    occasion: list[str] = Field(default_factory=list)
    serve_temp: str
    content_angle: list[str] = Field(default_factory=list)


class MenuTaggerItemOutput(BaseModel):
    name: str
    role: Literal["star", "puzzle"]
    category: str
    tags: MenuTaggerTagsOutput
    storytellingFit: Literal["strong", "weak"] = "weak"
    storytellingRationale: str = ""
    quantity: int | None = Field(default=None, ge=0)
    popularity: float | None = Field(default=None, ge=0, le=1)


class MenuTaggerUsedTagsOutput(BaseModel):
    kind: list[str] = Field(default_factory=list)
    ingredient: list[str] = Field(default_factory=list)
    taste: list[str] = Field(default_factory=list)
    course: list[str] = Field(default_factory=list)
    reel_moment: list[str] = Field(default_factory=list)
    texture: list[str] = Field(default_factory=list)
    prep_style: list[str] = Field(default_factory=list)
    occasion: list[str] = Field(default_factory=list)
    serve_temp: list[str] = Field(default_factory=list)
    content_angle: list[str] = Field(default_factory=list)


class MenuTaggerMilestoneOutput(BaseModel):
    taxonomyVersion: Literal["v2"]
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


class ReelLineupGroupItemOutput(BaseModel):
    name: str
    role: Literal["star", "puzzle"]
    category: str
    position: int = Field(ge=1, le=5)
    popularity: float | None = Field(default=None, ge=0.0, le=1.0)
    priceLevel: Literal[1, 2, 3] | None = None
    storytellingFit: Literal["strong", "weak"] | None = None
    reelMoment: str | None = None

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


class ReelLineupScheduleHintsOutput(BaseModel):
    preferredWeekdays: list[
        Literal[
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
        ]
    ] = Field(default_factory=list)
    preferredTime: str
    cadenceEligible: bool = True

    @field_validator("preferredWeekdays")
    @classmethod
    def _validate_preferred_weekdays(
        cls,
        values: list[
            Literal[
                "monday",
                "tuesday",
                "wednesday",
                "thursday",
                "friday",
                "saturday",
                "sunday",
            ]
        ],
    ) -> list[
        Literal[
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
        ]
    ]:
        if not values:
            raise ValueError("must contain at least one preferred weekday")
        if len(set(values)) != len(values):
            raise ValueError("preferredWeekdays must not contain duplicates")
        return values

    @field_validator("preferredTime")
    @classmethod
    def _validate_preferred_time(cls, value: str) -> str:
        text = value.strip()
        if not text:
            raise ValueError("preferredTime must be non-empty")
        return text


class ReelLineupGroupMixOutput(BaseModel):
    priceLevels: list[Literal[1, 2, 3]]
    storytellingStrongCount: int = Field(ge=0)
    starCount: int = Field(ge=0)
    puzzleCount: int = Field(ge=0)


class ReelLineupAnchorOutput(BaseModel):
    dimension: Literal["reel_moment"]
    value: str


class ReelLineupGroupOutput(BaseModel):
    id: str
    leadName: str
    profileId: Literal["hook_reel"]
    anchor: ReelLineupAnchorOutput
    items: list[ReelLineupGroupItemOutput]
    mix: ReelLineupGroupMixOutput
    clusterDescription: str
    strategyFocus: str | None = None
    coreMessage: str | None = None
    creativeRole: str | None = None
    assetHint: str | None = None
    scheduleHints: ReelLineupScheduleHintsOutput | None = None

    @field_validator("clusterDescription", mode="before")
    @classmethod
    def _normalize_cluster_description(cls, value: Any) -> str:
        return str(value or "").strip()

    @field_validator("clusterDescription")
    @classmethod
    def _validate_cluster_description(cls, value: str) -> str:
        if len(value) < 40:
            raise ValueError("clusterDescription must be at least 40 characters")
        return value

    @field_validator("items")
    @classmethod
    def _validate_items(
        cls, values: list[ReelLineupGroupItemOutput]
    ) -> list[ReelLineupGroupItemOutput]:
        if not (1 <= len(values) <= 5):
            raise ValueError("each group must contain between 1 and 5 items")
        positions = [item.position for item in values]
        if positions != list(range(1, len(values) + 1)):
            raise ValueError("item positions must be sequential starting at 1")
        return values


class ReelLineupMilestoneOutput(BaseModel):
    foodLeads: list[MenuTaggerItemOutput] = Field(default_factory=list)
    drinkLeads: list[MenuTaggerItemOutput] = Field(default_factory=list)
    groups: list[ReelLineupGroupOutput]
    drinkGroups: list[ReelLineupGroupOutput] = Field(default_factory=list)
    unassignedItemNames: list[str] = Field(default_factory=list)
    topFoodLeadNames: list[str] = Field(default_factory=list, max_length=5)
    targetGroupCount: int | None = Field(default=None, ge=4, le=8)
    sourceMenuTaggerTitle: str | None = None
    sourceCampaignBriefTitle: str | None = None
    notes: str | None = None

    @model_validator(mode="after")
    def _validate_lead_group_alignment(self) -> ReelLineupMilestoneOutput:
        if len(self.foodLeads) != len(self.groups):
            raise ValueError("foodLeads length must match groups length")
        if len(self.drinkLeads) != len(self.drinkGroups):
            raise ValueError("drinkLeads length must match drinkGroups length")
        for lead, group in zip(self.foodLeads, self.groups, strict=True):
            if lead.name.strip() != group.leadName.strip():
                raise ValueError("foodLeads[i].name must match groups[i].leadName")
        for lead, group in zip(self.drinkLeads, self.drinkGroups, strict=True):
            if lead.name.strip() != group.leadName.strip():
                raise ValueError("drinkLeads[i].name must match drinkGroups[i].leadName")
        return self


class PostLineupSlideOutput(BaseModel):
    dishName: str
    role: Literal["star", "puzzle"] | None = None
    category: str | None = None
    imageBrief: str

    @field_validator("dishName", "imageBrief", mode="before")
    @classmethod
    def _normalize_required_text(cls, value: Any) -> str:
        return str(value or "").strip()

    @field_validator("dishName", "imageBrief")
    @classmethod
    def _validate_non_empty(cls, value: str) -> str:
        if not value:
            raise ValueError("must be non-empty")
        return value


class PostLineupPostOutput(BaseModel):
    id: str
    format: Literal["carousel"]
    intent: Literal["pinned_monthly_menu"]
    title: str
    slides: list[PostLineupSlideOutput]

    @field_validator("id", "title", mode="before")
    @classmethod
    def _normalize_text(cls, value: Any) -> str:
        return str(value or "").strip()

    @field_validator("slides")
    @classmethod
    def _validate_slides(cls, values: list[PostLineupSlideOutput]) -> list[PostLineupSlideOutput]:
        if not values:
            raise ValueError("must contain at least one slide")
        if len(values) > 5:
            raise ValueError("must contain at most 5 slides")
        return values


class PostLineupMilestoneOutput(BaseModel):
    posts: list[PostLineupPostOutput]
    sourceReelLineupTitle: str | None = None
    notes: str | None = None

    @field_validator("posts")
    @classmethod
    def _validate_posts(cls, values: list[PostLineupPostOutput]) -> list[PostLineupPostOutput]:
        if not values:
            raise ValueError("must contain at least one post")
        return values


class SchedulerSlotOutput(BaseModel):
    kind: Literal["story", "post", "reel"] | None = None
    date: str
    time: str
    title: str

    @model_validator(mode="after")
    def _fill_legacy_kind(self) -> SchedulerSlotOutput:
        if self.kind is not None:
            return self
        title = self.title.strip()
        if title.startswith("Post:"):
            self.kind = "post"
        elif title.startswith("Reel:"):
            self.kind = "reel"
        else:
            self.kind = "story"
        return self


class SchedulerMilestoneOutput(BaseModel):
    startDate: str
    endDate: str
    publicHolidays: list[CampaignWindowPublicHoliday] = Field(default_factory=list)
    sourceDatesTitle: str | None = None
    sourceCampaignBriefTitle: str | None = None
    sourceReelLineupTitle: str | None = None
    sourcePostLineupTitle: str | None = None
    sourceStoryLineupTitle: str | None = None
    slots: list[SchedulerSlotOutput] = Field(default_factory=list)


class StoryLineupStoryOutput(BaseModel):
    id: str
    title: str
    date: str | None = None
    fixdate: bool = False
    reason: Literal["public_holiday"] | None = None
    holidayName: str | None = None
    time: str | None = None

    @field_validator("id", "title", mode="before")
    @classmethod
    def _normalize_text(cls, value: Any) -> str:
        return str(value or "").strip()

    @field_validator("id", "title")
    @classmethod
    def _validate_non_empty(cls, value: str) -> str:
        if not value:
            raise ValueError("must be non-empty")
        return value

    @model_validator(mode="after")
    def _validate_fixdate_date(self) -> StoryLineupStoryOutput:
        if self.fixdate and not str(self.date or "").strip():
            raise ValueError("date is required when fixdate is true")
        return self


class StoryLineupMilestoneOutput(BaseModel):
    stories: list[StoryLineupStoryOutput] = Field(default_factory=list)
    sourceDatesTitle: str | None = None


_SKILL_SCHEMA_REGISTRY: dict[str, type[BaseModel]] = {
    "public_holidays": DatesMilestoneOutput,
    "dates": DatesMilestoneOutput,
    "campaign_brief": CampaignBriefMilestoneOutput,
    "promotion_candidates": PromotionCandidatesMilestoneOutput,
    "menu_tagger": MenuTaggerMilestoneOutput,
    "reel_lineup": ReelLineupMilestoneOutput,
    "post_lineup": PostLineupMilestoneOutput,
    "story_lineup": StoryLineupMilestoneOutput,
    "scheduler": SchedulerMilestoneOutput,
    "culture_hooks": CultureHooksMilestoneOutput,
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
