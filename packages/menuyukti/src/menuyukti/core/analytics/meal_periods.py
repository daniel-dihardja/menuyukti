"""Shared meal-period and weekday constants for analytics pipelines."""

from __future__ import annotations

from datetime import datetime

MEAL_PERIODS: list[tuple[str, str, set[int]]] = [
    ("breakfast", "Breakfast (05:00–10:59)", set(range(5, 11))),
    ("lunch", "Lunch (11:00–14:59)", set(range(11, 15))),
    ("afternoon", "Afternoon (15:00–16:59)", set(range(15, 17))),
    ("dinner", "Dinner (17:00–21:59)", set(range(17, 22))),
    ("late_night", "Late Night (22:00–04:59)", set(range(22, 24)) | set(range(0, 5))),
]

WEEKDAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
WEEKEND_DAYS = {"sat", "sun"}


def weekday_abbr(dt: datetime) -> str:
    """Return 3-letter lowercase weekday abbreviation."""
    return dt.strftime("%a").lower()


def meal_period_for_hour(hour: int) -> str:
    for period, _label, hours in MEAL_PERIODS:
        if hour in hours:
            return period
    return "late_night"


def meal_period_label(period: str) -> str:
    for p, label, _ in MEAL_PERIODS:
        if p == period:
            return label
    return period


def meal_period_short_label(period: str) -> str:
    """Short display name without hour range (for charts and promo copy)."""
    for p, label, _ in MEAL_PERIODS:
        if p == period:
            return label.split(" (", 1)[0]
    return period.replace("_", " ").title()


def meal_period_hours_range(period: str) -> str:
    """Hour range for a meal period, e.g. 11:00–14:59."""
    for p, label, _ in MEAL_PERIODS:
        if p == period:
            if " (" in label and label.endswith(")"):
                return label.split(" (", 1)[1][:-1]
            return label
    return ""
