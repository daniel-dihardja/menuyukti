"""Shared state for the agent graph and subgraphs."""

from dataclasses import dataclass, field
from typing import Any, Literal, TypedDict

from pydantic import BaseModel, Field

# Intent category: top-level classification (extend with more later, e.g. "content")
IntentCategory = Literal["planning"]

HolidayType = Literal["public", "regional", "religious_observance", "unknown"]


class NationalHoliday(TypedDict):
    """A single national/public holiday entry."""

    id: str
    localName: str
    name: str
    date: str
    type: HolidayType


class CandidateSlot(BaseModel):
    """A single candidate posting date generated from the campaign calendar."""

    date: str
    day_name: str
    week_number: int
    holiday_id: str | None = None
    """Set when this date exactly matches a public holiday."""
    proximity: str | None = None
    """Set to 'day_before_HOLIDAY_ID' or 'day_after_HOLIDAY_ID' for adjacent dates."""
    is_pinned: bool = False
    """True when this date is a public holiday — slot is always included in the schedule."""


class CandidateWeek(BaseModel):
    """A campaign week with its candidate posting dates."""

    week_number: int
    week_label: str
    is_partial: bool
    slots: list[CandidateSlot]


class WeekSelection(BaseModel):
    """The LLM's date selection for a single campaign week."""

    week_number: int
    selected_dates: list[str]
    """Selected ISO dates from the candidate list. Capped at 5 non-pinned dates by _validate_and_clamp; minimum 3 enforced in validation for full weeks."""


class PostSchedule(BaseModel):
    """The full post schedule across all campaign weeks, produced by the scheduler LLM."""

    weeks: list[WeekSelection]


class FormatAssignment(BaseModel):
    """Format decision for a single promotion slot, produced by the format-assignment LLM."""

    scheduled_date: str
    format: Literal["single", "carousel"]
    items: list[str]
    """Exactly 1 item name for single posts; 2–4 item names for carousels."""
    carousel_narrative: str | None = None
    """Brief framing angle explaining why these items belong together (carousel only)."""


class PostFormatPlan(BaseModel):
    """Full set of format assignments for all promotion slots in the campaign."""

    assignments: list[FormatAssignment]


class PostSlot(BaseModel):
    """A single planned Instagram post within a campaign."""

    scheduled_date: str
    scheduled_time: str = "09:00"
    """Recommended posting time derived server-side from primaryMealPeriod."""
    theme: Literal["holiday", "promotion", "engagement"]
    format: Literal["single", "carousel"] = "single"
    """Post format: single image/video or multi-slide carousel."""
    focus_item: str | None = None
    """The promoted menu item name for single-format promotion posts."""
    carousel_items: list[str] | None = None
    """Ordered list of item names for carousel posts (2–4 items)."""
    carousel_narrative: str | None = None
    """Framing angle explaining why these items belong together (carousel only)."""
    caption_seed: str
    """One-sentence directive seed. Will be expanded into a full caption by the executor."""
    holiday_id: str | None = None
    """Derived server-side from the canonical holiday map; never set by the LLM."""
    source: Literal["holiday_pinned", "llm_suggested"] = "llm_suggested"
    """Derived server-side. Designed for extension: user_added / user_removed come in the refinement feature."""


class CampaignBrief(BaseModel):
    """Structured campaign brief produced by the planner — input contract for the executor."""

    campaign_theme: str
    tone: str
    target_audience: str
    posting_cadence: str
    post_slots: list[PostSlot]


@dataclass
class ReflectionIteration:
    iteration: int
    verdict: str
    feedback: list[str]
    draft: str


@dataclass
class PlanningState:
    dateStart: str | None = None
    dateEnd: str | None = None
    location: dict[str, Any] | None = None
    nationalHolidays: list[NationalHoliday] | None = field(default=None)
    operatingProfile: dict[str, Any] | None = None
    locationSummary: str | None = None
    reflectionLog: list[ReflectionIteration] | None = field(default=None)
    promotionItems: list[dict[str, Any]] | None = None
    candidateWeeks: list[CandidateWeek] | None = field(default=None)
    postSchedule: PostSchedule | None = None
    postFormatPlan: PostFormatPlan | None = None
    postFormatReflectionLog: list[ReflectionIteration] | None = field(default=None)
    campaign_brief: CampaignBrief | None = None
    plan: list[str] | None = field(default=None)
    current_step: int = 0


@dataclass
class State:
    message: str
    intent_category: IntentCategory = "planning"
    response: str | None = None
    intent: str | None = None
    planning: PlanningState | None = None
