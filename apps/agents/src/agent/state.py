"""Shared state for the agent graph and subgraphs."""

from dataclasses import dataclass, field
from typing import Any, Literal, TypedDict

from pydantic import BaseModel

# Intent category: top-level classification (extend with more later, e.g. "content")
IntentCategory = Literal["planning"]

HolidayType = Literal["public", "regional", "religious_observance", "unknown"]


class NationalHoliday(TypedDict):
    """A single national/public holiday entry."""

    localName: str
    name: str
    date: str
    type: HolidayType


class PostSlot(BaseModel):
    """A single planned Instagram post within a campaign."""

    scheduled_date: str
    theme: Literal["holiday", "promotion", "engagement"]
    focus_item: str | None = None
    caption_seed: str
    """One-sentence directive seed. Will be expanded into a full caption by the executor."""


class CampaignBrief(BaseModel):
    """Structured campaign brief produced by the planner — input contract for the executor."""

    campaign_theme: str
    tone: str
    target_audience: str
    posting_cadence: str
    post_slots: list[PostSlot]


@dataclass
class PlanningState:
    dateStart: str | None = None
    dateEnd: str | None = None
    nationalHolidays: list[NationalHoliday] | None = field(default=None)
    operatingProfile: dict[str, Any] | None = None
    locationSummary: str | None = None
    promotionItems: list[dict[str, Any]] | None = None
    campaign_brief: CampaignBrief | None = None


@dataclass
class State:
    message: str
    intent_category: IntentCategory = "planning"
    response: str | None = None
    intent: str | None = None
    planning: PlanningState | None = None
