"""State schema for dedicated menu_clusterer milestone execution."""

from __future__ import annotations

from typing import Any, Literal, NotRequired, TypedDict


class MenuClustererGroupItem(TypedDict):
    name: str
    role: Literal["star", "puzzle"]
    category: str
    position: int
    popularity: NotRequired[float]
    priceLevel: NotRequired[Literal[1, 2, 3]]
    storytellingFit: NotRequired[Literal["strong", "weak"]]
    reelMoment: NotRequired[str]


class MenuClustererGroupMix(TypedDict):
    priceLevels: list[Literal[1, 2, 3]]
    storytellingStrongCount: int
    starCount: int
    puzzleCount: int


class MenuClustererAnchor(TypedDict):
    dimension: Literal["reel_moment"]
    value: str


class MenuClustererGroup(TypedDict):
    id: str
    leadName: str
    profileId: Literal["hook_reel", "menu_highlight"]
    anchor: MenuClustererAnchor
    items: list[MenuClustererGroupItem]
    mix: MenuClustererGroupMix
    clusterDescription: str
    strategyFocus: NotRequired[str]
    coreMessage: NotRequired[str]
    creativeRole: NotRequired[str]
    assetHint: NotRequired[str]


class MenuClustererOutput(TypedDict):
    foodLeads: list[dict[str, Any]]
    groups: list[MenuClustererGroup]
    unassignedItemNames: list[str]
    topFoodLeadNames: NotRequired[list[str]]
    targetGroupCount: NotRequired[int]
    signatureGroupCount: NotRequired[int]
    sourceMenuTaggerTitle: NotRequired[str]
    sourceCampaignBriefTitle: NotRequired[str]
    notes: NotRequired[str]


class MenuClustererState(TypedDict):
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
    target_group_count: NotRequired[int]
    signature_group_count: NotRequired[int]
    generated_output: NotRequired[MenuClustererOutput | None]
    result_data: str
    milestone_data: NotRequired[dict[str, Any] | None]
    milestonedata_written: bool
