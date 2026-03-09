"""Shared state for the agent graph and subgraphs."""

from dataclasses import dataclass, field
from typing import Literal, TypedDict

# Intent category: top-level classification (extend with more later, e.g. "content")
IntentCategory = Literal["planning"]


class NationalHoliday(TypedDict):
    """A single national/public holiday entry."""

    localName: str
    name: str
    date: str


@dataclass
class PlanningState:
    dateStart: str | None = None
    dateEnd: str | None = None
    nationalHolidays: list[NationalHoliday] | None = field(default=None)


@dataclass
class State:
    message: str
    intent_category: IntentCategory = "planning"
    response: str | None = None
    intent: str | None = None
    planning: PlanningState | None = None
