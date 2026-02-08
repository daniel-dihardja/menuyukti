from pydantic import BaseModel, Field
from typing import List, Literal


# ---------------------------------------------------------
# Time Dimensions
# ---------------------------------------------------------

Weekday = Literal["mon", "tue", "wed", "thu", "fri", "sat", "sun"]


# ---------------------------------------------------------
# Hourly Demand
# ---------------------------------------------------------
# Represents observed purchase behavior at a specific hour.
#
# Why this matters:
# Hour-level demand is one of the strongest predictors
# of marketing timing success.
#
# Future primitives derived from this:
#   - peak_hour
#   - demand concentration
#   - dead hours
#   - momentum
# ---------------------------------------------------------


class HourlyDemand(BaseModel):
    hour: int = Field(ge=0, le=23, description="Hour of day in 24h format.")

    quantity: int = Field(ge=0, description="Units sold during this hour.")


# ---------------------------------------------------------
# Weekly Demand
# ---------------------------------------------------------
# Captures routine behavior patterns.
#
# Routine revenue is premium revenue because it is:
#   - predictable
#   - habit-driven
#   - less price sensitive
# ---------------------------------------------------------


class WeeklyDemand(BaseModel):
    day: Weekday = Field(description="Day of week.")

    quantity: int = Field(ge=0, description="Units sold on this weekday.")


# ---------------------------------------------------------
# MenuHeatmap
# ---------------------------------------------------------
# Represents behavioral demand for ONE menu item.
#
# This model becomes the foundation for:
#
# ✔ promotion timing
# ✔ campaign scheduling
# ✔ daypart marketing
# ✔ dead-hour activation
# ✔ routine detection
#
# Think of this as:
#     'Behavioral twin of the product'
# ---------------------------------------------------------


class MenuHeatmap(BaseModel):

    # -----------------------------
    # Identity
    # -----------------------------

    menu: str = Field(description="Menu item name.")

    menu_category: str = Field(
        description="Top-level category (useful for campaign grouping)."
    )

    menu_category_detail: str = Field(
        description="Granular classification for advanced segmentation."
    )

    # -----------------------------
    # Behavioral Observations
    # -----------------------------

    daily_heatmap: List[HourlyDemand] = Field(
        description="Observed hourly demand distribution."
    )

    weekly_heatmap: List[WeeklyDemand] = Field(
        description="Observed weekday demand distribution."
    )

    # -----------------------------
    # HIGHLY Recommended
    # -----------------------------

    reporting_period: str = Field(
        description="Time window used to compute the heatmap (e.g., '2025-02')."
    )
