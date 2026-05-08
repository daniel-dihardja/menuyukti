"""State schema for dedicated culture-hooks milestone execution."""

from __future__ import annotations

from typing import Any, NotRequired, TypedDict


class CultureHookIntersection(TypedDict):
    topic: str
    conceptLink: str
    audienceRelevance: str
    contentExample: str


class CultureHooksOutput(TypedDict):
    locationConcept: str
    targetAudience: str
    intersections: list[CultureHookIntersection]
    guardrailCheck: str


class CultureHooksState(TypedDict):
    """State carried through dedicated culture-hooks generation and persistence."""

    milestone_id: str
    location_id: int
    user_id: str
    goal: str
    criteria: list[dict[str, str]]
    milestone_input: NotRequired[dict[str, Any] | None]
    run_id: NotRequired[str]
    traceparent: NotRequired[str | None]
    prior_milestones_data: NotRequired[str]
    injected_prior_context_markdown: NotRequired[str]
    owner_notes_markdown: NotRequired[str]
    generation_context_markdown: NotRequired[str]
    generated_output: NotRequired[CultureHooksOutput | None]
    result_data: str
    milestone_data: NotRequired[dict[str, Any] | list[Any] | None]
    milestonedata_written: bool
