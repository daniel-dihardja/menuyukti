"""Shared day × meal-period slot keys for timing and demand analytics."""

from __future__ import annotations

from datetime import datetime

from menuyukti.core.analytics.meal_periods import meal_period_for_hour, weekday_abbr


def slot_key(dt: datetime) -> tuple[str, str]:
    """Return (weekday_abbr, meal_period) for a bill timestamp."""
    return weekday_abbr(dt), meal_period_for_hour(dt.hour)
