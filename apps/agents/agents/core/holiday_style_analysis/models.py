"""DTOs for public-holiday style foundation analysis."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class StyleAnalysisResult(BaseModel):
    """Shared visual style foundation for all holiday story artworks."""

    summary: str = Field(
        min_length=1,
        max_length=1000,
        description="One-paragraph summary of the visual style",
    )
    palette: str = Field(
        min_length=1,
        max_length=500,
        description="Dominant colors and color relationships",
    )
    lighting: str = Field(
        min_length=1,
        max_length=500,
        description="Lighting quality, direction, and mood",
    )
    medium: str = Field(
        min_length=1,
        max_length=500,
        description="Medium or technique (photo, illustration, collage, etc.)",
    )
    avoid: str = Field(
        min_length=1,
        max_length=500,
        description="What to avoid so generated images stay on-style",
    )

    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)
