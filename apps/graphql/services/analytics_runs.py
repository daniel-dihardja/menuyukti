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
    run with the largest id strictly less than ``current_run_id`` for this location.

    Returns None if there is no analytics run with ``current_run_id`` for this
    location (same as the legacy full-scan implementation).
    """
    current = (
        session.query(AnalyticsRun)
        .filter(
            AnalyticsRun.location_id == location_id,
            AnalyticsRun.id == current_run_id,
        )
        .first()
    )
    if current is None:
        return None
    return (
        session.query(AnalyticsRun)
        .filter(
            AnalyticsRun.location_id == location_id,
            AnalyticsRun.id < current_run_id,
        )
        .order_by(AnalyticsRun.id.desc())
        .first()
    )
