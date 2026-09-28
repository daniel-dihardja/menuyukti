"""DTOs for public-holiday Instagram story drafting."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, field_validator


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


class CritiqueConfig(BaseModel):
    """Optional generate → critique → revise settings for one draft call."""

    prompt: str = Field(min_length=1, max_length=2000)
    max_iterations: int = Field(alias="maxIterations", ge=1, le=3)
    min_score: int = Field(alias="minScore", ge=1, le=10)

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("prompt")
    @classmethod
    def strip_prompt(cls, value: str) -> str:
        text = value.strip()
        if not text:
            raise ValueError("critique prompt must not be empty")
        return text


class CritiqueVerdictLlm(BaseModel):
    """Structured LLM critic output (passed is derived in code from minScore)."""

    score: int = Field(ge=1, le=10, description="Quality score from 1 (poor) to 10 (excellent)")
    feedback: str = Field(
        min_length=1,
        max_length=1000,
        description="Concrete revision guidance when score is below the threshold; "
        "brief confirmation when the draft already meets the criteria",
    )

    model_config = ConfigDict(populate_by_name=True)


class CritiqueVerdict(BaseModel):
    """Critic verdict with derived pass flag for API responses."""

    score: int = Field(ge=1, le=10)
    feedback: str = Field(min_length=1, max_length=1000)
    passed: bool

    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)


class CritiqueRound(BaseModel):
    """One critique cycle: draft that was scored plus the verdict."""

    draft: StoryDraftResult
    verdict: CritiqueVerdict

    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)


class CritiqueSummary(BaseModel):
    """Optional critique metadata returned with a story draft."""

    rounds: list[CritiqueRound]
    final_score: int = Field(alias="finalScore", ge=1, le=10)
    passed: bool

    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)


class StoryDraftItem(BaseModel):
    """Stable API item: holiday identity plus draft result."""

    id: str
    date: str
    name: str
    result: StoryDraftResult
    critique: CritiqueSummary | None = None

    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)
