"""Tests for campaign objective normalization and deterministic eval."""

from __future__ import annotations

from agents_app.agents.core.campaign_brief.objective import (
    campaign_objective_has_dual_outcome,
    normalize_campaign_objective,
)
from agents_app.agents.core.milestone_eval.campaign_brief_eval import (
    try_campaign_brief_deterministic_verdict,
)


def test_dual_outcome_detection() -> None:
    assert campaign_objective_has_dual_outcome(
        "Increase reservations and grow lunch traffic in conversion stage"
    )
    assert not campaign_objective_has_dual_outcome("Increase reservations in conversion stage")


def test_normalize_keeps_first_outcome_and_funnel_tail() -> None:
    assert (
        normalize_campaign_objective(
            "Increase reservations and grow lunch traffic in conversion stage"
        )
        == "Increase reservations in conversion stage"
    )


def test_deterministic_campaign_objective_passes_single_outcome() -> None:
    data = {
        "venueSnapshot": {
            "venueName": "Cafe",
            "city": "Berlin",
            "country": "DE",
            "currency": "EUR",
        },
        "campaignObjective": "Increase reservations in conversion stage",
        "contentPillars": ["A", "B", "C"],
    }
    status, _ = try_campaign_brief_deterministic_verdict(
        "**Campaign objective** states one primary business outcome and a dominant funnel stage.",
        data,
    )
    assert status == "pass"


def test_deterministic_campaign_objective_fails_dual_outcome() -> None:
    data = {
        "venueSnapshot": {
            "venueName": "Cafe",
            "city": "Berlin",
            "country": "DE",
            "currency": "EUR",
        },
        "campaignObjective": "Increase reservations and grow lunch traffic in conversion stage",
        "contentPillars": ["A", "B", "C"],
    }
    status, reason = try_campaign_brief_deterministic_verdict(
        "**Campaign objective** states one primary business outcome and a dominant funnel stage.",
        data,
    )
    assert status == "fail"
    assert "more than one primary business outcome" in reason
