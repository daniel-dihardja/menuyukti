"""Shared state for milestone evaluation LangGraph."""

from __future__ import annotations

import operator
from typing import Annotated, TypedDict


class CriterionEval(TypedDict):
    id: str
    requirement: str
    status: str
    reasoning: str


class MilestoneEvalState(TypedDict):
    """State for milestone evaluation; `evaluated` uses additive reducer for Send fan-in."""

    milestone_id: str
    location_id: int
    user_id: str
    goal: str
    raw_data: str
    criteria: list[dict[str, str]]
    evaluated: Annotated[list[CriterionEval], operator.add]
    result_summary: str
    result_node_id: str | None
