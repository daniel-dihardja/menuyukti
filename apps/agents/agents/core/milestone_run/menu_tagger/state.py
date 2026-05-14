"""State schema for dedicated menu-tagger milestone execution."""

from __future__ import annotations

from typing import Any, Literal, NotRequired, TypedDict


class MenuTaggerTags(TypedDict):
    kind: Literal["food", "drink", "other"]
    ingredient: list[str]
    taste: list[str]
    course: list[str]
    reel_moment: str
    texture: list[str]
    prep_style: list[str]
    occasion: list[str]
    serve_temp: str
    content_angle: list[str]


class MenuTaggerItem(TypedDict):
    name: str
    role: Literal["star", "puzzle"]
    category: str
    tags: MenuTaggerTags
    storytellingFit: NotRequired[Literal["strong", "weak"]]
    storytellingRationale: NotRequired[str]


class MenuTaggerUsedTags(TypedDict):
    kind: list[str]
    ingredient: list[str]
    taste: list[str]
    course: list[str]
    reel_moment: list[str]
    texture: list[str]
    prep_style: list[str]
    occasion: list[str]
    serve_temp: list[str]
    content_angle: list[str]


class MenuTaggerOutput(TypedDict):
    taxonomyVersion: Literal["v2"]
    sourcePromotionCandidatesTitle: NotRequired[str]
    items: list[MenuTaggerItem]
    usedTags: MenuTaggerUsedTags
    notes: NotRequired[str]


class MenuTaggerState(TypedDict):
    """State carried through dedicated menu-tagger generation and persistence."""

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
    generation_context_markdown: NotRequired[str]
    source_promotion_candidates_title: NotRequired[str]
    input_items: NotRequired[list[MenuTaggerItem]]
    generated_output: NotRequired[MenuTaggerOutput | None]
    result_data: str
    milestone_data: NotRequired[dict[str, Any] | None]
    milestonedata_written: bool
