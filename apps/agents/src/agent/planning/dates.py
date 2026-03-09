"""Pure date helpers for campaign scheduling."""

import calendar
from datetime import datetime


def _get_current_date() -> str:
    """Return today's date in YYYY-MM-DD format."""
    return datetime.now().strftime("%Y-%m-%d")


def _compute_campaign_dates() -> tuple[str, str]:
    """Return (dateStart, dateEnd) for the next calendar month."""
    today = datetime.strptime(_get_current_date(), "%Y-%m-%d")
    year, month = today.year, today.month + 1
    if month > 12:
        month = 1
        year += 1
    last_day = calendar.monthrange(year, month)[1]
    date_start = datetime(year, month, 1).strftime("%Y-%m-%d")
    date_end = datetime(year, month, last_day).strftime("%Y-%m-%d")
    return date_start, date_end
