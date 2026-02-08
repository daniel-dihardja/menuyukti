from statistics import median
from typing import List

from app.decision.models.matrix_item import MatrixItem
from app.decision.primitives.economic_primitives import EconomicPrimitives


def compute_economic_primitives(
    item: MatrixItem,
    all_items: List[MatrixItem],
) -> EconomicPrimitives:
    """
    Converts raw matrix data into normalized economic primitives.

    Normalization is critical —
    restaurants vary wildly in price levels.
    """

    margins = [i.margin_per_unit for i in all_items]
    volumes = [i.quantity for i in all_items]
    velocities = [i.margin_per_unit * i.quantity for i in all_items]

    median_margin = median(margins) or 1
    median_volume = median(volumes) or 1
    median_velocity = median(velocities) or 1

    profit_velocity = item.margin_per_unit * item.quantity

    return EconomicPrimitives(
        profit_velocity=profit_velocity,
        margin_strength=item.margin_per_unit / median_margin,
        volume_strength=item.quantity / median_volume,
        contribution_share=item.contribution_margin_percentage,
    )
