"""State schema for dedicated reel_lineup milestone execution."""

from __future__ import annotations

from typing import Any, Literal, NotRequired, TypedDict


class ReelLineupGroupItem(TypedDict):
    name: str
    role: Literal["star", "puzzle"]
    category: str
    position: int
    popularity: NotRequired[float]
    priceLevel: NotRequired[Literal[1, 2, 3]]
    storytellingFit: NotRequired[Literal["strong", "weak"]]
    reelMoment: NotRequired[str]


class ReelLineupScheduleHints(TypedDict):
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
    ]
    preferredTime: str
    cadenceEligible: bool


class ReelLineupGroupMix(TypedDict):
    priceLevels: list[Literal[1, 2, 3]]
    storytellingStrongCount: int
    starCount: int
    puzzleCount: int


class ReelLineupAnchor(TypedDict):
    dimension: Literal["reel_moment"]
    value: str


class ReelLineupGroup(TypedDict):
    id: str
    leadName: str
    profileId: Literal["hook_reel"]
    anchor: ReelLineupAnchor
    items: list[ReelLineupGroupItem]
    mix: ReelLineupGroupMix
    strategyFocus: NotRequired[str]
    coreMessage: NotRequired[str]
    creativeRole: NotRequired[str]
    assetHint: NotRequired[str]
    scheduleHints: NotRequired[ReelLineupScheduleHints]


class ReelLineupOutput(TypedDict):
    foodLeads: list[dict[str, Any]]
    drinkLeads: list[dict[str, Any]]
    groups: list[ReelLineupGroup]
    drinkGroups: list[ReelLineupGroup]
    unassignedItemNames: list[str]
    sourceMenuTaggerTitle: NotRequired[str]
    sourceCampaignBriefTitle: NotRequired[str]
    notes: NotRequired[str]


class ReelLineupState(TypedDict):
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
    owner_notes_markdown: NotRequired[str]
    campaign_brief_data: NotRequired[dict[str, Any] | None]
    source_campaign_brief_title: NotRequired[str]
    menu_tagger_items: NotRequired[list[dict[str, Any]]]
    source_menu_tagger_title: NotRequired[str]
    generated_output: NotRequired[ReelLineupOutput | None]
    result_data: str
    milestone_data: NotRequired[dict[str, Any] | None]
    milestonedata_written: bool
