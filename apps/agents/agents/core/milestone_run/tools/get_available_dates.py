"""LangChain tool: list dates in a range with optional weekend / public-holiday exclusion."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any

import httpx
from langchain_core.tools import BaseTool, tool


def _parse_iso_date(value: str) -> date | None:
    text = value.strip()
    if not text:
        return None
    try:
        return datetime.strptime(text, "%Y-%m-%d").date()
    except ValueError:
        return None


def make_get_available_dates_tool(
    _context: dict[str, Any],
    _location_id: int,
    _user_id: str,
    _client: httpx.AsyncClient,
) -> BaseTool:
    @tool
    def get_available_dates(
        start_date: str,
        end_date: str,
        exclude_weekends: bool = False,
        exclude_holidays: bool = False,
        public_holiday_dates: list[str] | None = None,
    ) -> str:
        """List each calendar day from start_date through end_date (inclusive), YYYY-MM-DD.

        Optional filters:
        - exclude_weekends: when True, omit Saturday and Sunday.
        - exclude_holidays: when True, omit any date whose YYYY-MM-DD appears in
          public_holiday_dates (from the Dates milestone publicHolidays[].date).

        Returns a markdown table (Date | Weekday) or an error message if the range is invalid.
        """
        start = _parse_iso_date(start_date)
        end = _parse_iso_date(end_date)
        if start is None or end is None:
            return "Invalid date: use YYYY-MM-DD for start_date and end_date."
        if start > end:
            return "Invalid range: start_date must be on or before end_date."

        holiday_set: set[str] = set()
        if public_holiday_dates:
            for raw in public_holiday_dates:
                if isinstance(raw, str) and raw.strip():
                    holiday_set.add(raw.strip())

        lines: list[str] = []
        lines.append("| Date | Weekday |")
        lines.append("| --- | --- |")
        current = start
        while current <= end:
            iso = current.strftime("%Y-%m-%d")
            weekday = current.weekday()
            if exclude_weekends and weekday >= 5:
                current += timedelta(days=1)
                continue
            if exclude_holidays and iso in holiday_set:
                current += timedelta(days=1)
                continue
            day_name = current.strftime("%A")
            lines.append(f"| {iso} | {day_name} |")
            current += timedelta(days=1)

        if len(lines) <= 2:
            return (
                "No dates remain after applying filters (weekend/holiday exclusion). "
                "Widen the window or relax exclude_weekends / exclude_holidays."
            )
        return "Available posting dates:\n\n" + "\n".join(lines)

    return get_available_dates
