"""DTOs for public-holiday relevance scoring (stable for LLM → Jev swap)."""

from __future__ import annotations

from pydantic import BaseModel, Field


class HolidayInput(BaseModel):
    """Holiday row passed into the scorer."""

    id: str = Field(min_length=1, max_length=256)
    date: str = Field(min_length=1, max_length=32)
    name: str = Field(min_length=1, max_length=512)
    local_name: str | None = Field(default=None, max_length=512, alias="localName")

    model_config = {"populate_by_name": True}


class HolidayRelevanceItem(BaseModel):
    """Stable output item — do not change field names for a future Jev provider."""

    id: str
    date: str
    name: str
    relevant: bool


class HolidayRelevanceOutput(BaseModel):
    """Structured LLM output wrapper."""

    holidays: list[HolidayRelevanceItem] = Field(
        description="One entry per input holiday with the same id, date, and name",
    )
