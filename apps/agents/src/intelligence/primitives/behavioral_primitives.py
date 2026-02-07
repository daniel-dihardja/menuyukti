from pydantic import BaseModel, Field


class BehavioralPrimitives(BaseModel):
    class Config:
        frozen = True

    """
    Represents observed customer demand patterns.

    These metrics explain WHEN customers buy —
    which is critical for marketing timing decisions.
    """

    peak_hour: int = Field(
        ge=0,
        le=23,
        description="""
        Hour with the highest sales volume.

        WHY IT MATTERS:
        Marketing should occur BEFORE this window.
        """,
    )

    peak_share: float = Field(
        ge=0,
        le=1,
        description="""
        Percentage of total demand occurring during
        the peak hour.

        WHY IT MATTERS:
        High concentration increases marketing precision.
        """,
    )

    demand_concentration: float = Field(
        ge=0,
        le=1,
        description="""
        Share of demand captured by the top selling hours.

        WHY IT MATTERS:
        Narrow demand windows are easier to influence.
        """,
    )

    weekday_share: float = Field(
        ge=0,
        le=1,
        description="""
        Portion of sales occurring Monday–Friday.

        WHY IT MATTERS:
        Routine behavior is predictable and safer to promote.
        """,
    )

    dead_hours: int = Field(
        ge=0,
        le=24,
        description="""
        Number of hours with negligible demand.

        WHY IT MATTERS:
        Represents potential revenue expansion windows.
        """,
    )
