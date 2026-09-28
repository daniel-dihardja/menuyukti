"""DTOs for public-holiday Instagram story drafting."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class HolidayInput(BaseModel):
    """Holiday row passed into the story drafter."""

    id: str = Field(min_length=1, max_length=256)
    date: str = Field(min_length=1, max_length=32)
    name: str = Field(min_length=1, max_length=512)
    local_name: str | None = Field(default=None, max_length=512, alias="localName")

    model_config = ConfigDict(populate_by_name=True)


class StoryDraftResult(BaseModel):
    """Structured LLM output for one Instagram story draft."""

    caption: str = Field(
        min_length=1,
        max_length=500,
        description="Short Instagram story caption or overlay text for this holiday",
    )
    visual_brief: str = Field(
        min_length=1,
        max_length=1000,
        alias="visualBrief",
        description="Concise art-direction brief for the story visual/artwork",
    )

    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)


class StoryDraftItem(BaseModel):
    """Stable API item: holiday identity plus draft result."""

    id: str
    date: str
    name: str
    result: StoryDraftResult

    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)
