"""DTOs for public-holiday visual briefs."""

from __future__ import annotations

from agents_app.agents.core.holiday_story_draft.models import HolidayInput, StoryDraftResult
from agents_app.agents.core.holiday_style_analysis.models import StyleAnalysisResult
from agents_app.agents.core.holiday_visual_brief.prompts import MAX_LEONARDO_PROMPT_LEN
from pydantic import BaseModel, ConfigDict, Field, field_validator


class VisualBriefResult(BaseModel):
    """Structured visual brief for one holiday Instagram story image."""

    scene: str = Field(
        min_length=1,
        max_length=1000,
        description="What is shown in the frame",
    )
    mood: str = Field(
        min_length=1,
        max_length=500,
        description="Emotional tone and atmosphere",
    )
    composition: str = Field(
        min_length=1,
        max_length=1000,
        description="Framing, layout, and 9:16 story composition notes",
    )
    leonardo_prompt: str = Field(
        alias="leonardoPrompt",
        min_length=1,
        max_length=MAX_LEONARDO_PROMPT_LEN,
        description=(
            "Ready-to-send Leonardo text-to-image prompt "
            f"(max {MAX_LEONARDO_PROMPT_LEN} chars — Leonardo API hard limit)"
        ),
    )

    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    @field_validator("leonardo_prompt", mode="before")
    @classmethod
    def truncate_leonardo_prompt(cls, value: object) -> object:
        """Clip overlong LLM output to Leonardo's hard limit before max_length runs."""
        if isinstance(value, str) and len(value) > MAX_LEONARDO_PROMPT_LEN:
            return value[:MAX_LEONARDO_PROMPT_LEN].rstrip()
        return value


class VisualBriefItem(BaseModel):
    """Stable API item: holiday identity plus visual brief."""

    id: str
    date: str
    name: str
    result: VisualBriefResult

    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)


class StyleAnalysisInput(StyleAnalysisResult):
    """Style foundation passed into visual brief drafting (same fields)."""

    @field_validator("summary", "palette", "lighting", "medium", "avoid")
    @classmethod
    def strip_fields(cls, value: str) -> str:
        text = value.strip()
        if not text:
            raise ValueError("style analysis fields must not be empty")
        return text


# Re-export for router convenience
__all__ = [
    "HolidayInput",
    "StoryDraftResult",
    "StyleAnalysisInput",
    "StyleAnalysisResult",
    "VisualBriefItem",
    "VisualBriefResult",
]
