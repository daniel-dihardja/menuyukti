from pydantic import BaseModel, Field


class EconomicPrimitives(BaseModel):
    class Config:
        frozen = True

    """
    Represents the raw economic performance of a menu item.

    IMPORTANT:
    These metrics describe financial reality.
    They must NOT contain decisions or recommendations.
    """

    profit_velocity: float = Field(
        description="""
        Speed at which the item generates profit.

        Computed as:
            margin_per_unit x quantity

        WHY IT MATTERS:
        Fast-profit items create immediate revenue impact
        when promoted.
        """
    )

    margin_strength: float = Field(
        description="""
        Normalized profitability of the item relative
        to the menu median.

        WHY IT MATTERS:
        Higher margin items produce more profit per sale.
        """
    )

    volume_strength: float = Field(
        description="""
        Normalized popularity relative to the menu median.

        WHY IT MATTERS:
        High-volume items indicate validated customer demand.
        """
    )

    contribution_share: float = Field(
        ge=0,
        le=1,
        description="""
        Percentage of total restaurant profit generated
        by this item.

        WHY IT MATTERS:
        Items above ~10% often act as profit anchors.
        """,
    )
