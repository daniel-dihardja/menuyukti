"""Shared state for the agent graph and subgraphs."""

from dataclasses import dataclass
from typing import Literal

# Intent category: top-level classification (extend with more later, e.g. "content")
IntentCategory = Literal["planning"]


@dataclass
class PlanningState:
    dateStart: str | None = None
    dateEnd: str | None = None
    relevantEvents: str | None = None


@dataclass
class State:
    message: str
    intent_category: IntentCategory = "planning"
    response: str | None = None
    intent: str | None = None
    planning: PlanningState | None = None
