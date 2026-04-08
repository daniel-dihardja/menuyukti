"""Helpers for resolving analytics runs within a location."""

from __future__ import annotations

from sqlalchemy.orm import Session

from graphql.data_sources import AnalyticsRun


def get_previous_analytics_run(
    session: Session, location_id: int, current_run_id: int
) -> AnalyticsRun | None:
    """
    Return the next-older analytics run for the same location.

    Runs are ordered by id descending (newest first); the "previous" period is the
    run immediately after the current id in that list.
    """
    runs = (
        session.query(AnalyticsRun)
        .where(AnalyticsRun.location_id == location_id)
        .order_by(AnalyticsRun.id.desc())
        .all()
    )
    ids = [r.id for r in runs]
    try:
        idx = ids.index(current_run_id)
    except ValueError:
        return None
    if idx + 1 < len(runs):
        return runs[idx + 1]
    return None
