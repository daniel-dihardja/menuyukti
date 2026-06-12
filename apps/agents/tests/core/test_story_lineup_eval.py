"""Tests for story_lineup deterministic eval helpers."""

from __future__ import annotations

from agents_app.agents.core.milestone_eval.story_lineup_eval import (
    try_story_lineup_deterministic_verdict,
)


def _payload_with_user_review() -> dict[str, object]:
    return {
        "stories": [
            {
                "id": "story-user-review",
                "title": "Story: positive customer review",
                "fixdate": False,
                "reason": "user_review",
                "intervalWeeks": 4,
            },
            {
                "id": "story-public-holiday-2026-06-15-easter-sunday",
                "title": "Story: sending happy Easter Sunday",
                "date": "2026-06-15",
                "fixdate": True,
                "reason": "public_holiday",
            },
        ],
        "sourceDatesTitle": "Campaign dates",
    }


def test_user_review_criterion_passes_when_present() -> None:
    verdict = try_story_lineup_deterministic_verdict(
        "**stories** always includes one **user_review** story with **fixdate** false.",
        _payload_with_user_review(),
    )
    assert verdict == (
        "pass",
        "Story lineup includes exactly one user_review story with fixdate false.",
    )


def test_user_review_criterion_fails_when_missing() -> None:
    payload = {
        "stories": [
            {
                "id": "story-public-holiday-2026-06-15-easter-sunday",
                "title": "Story: sending happy Easter Sunday",
                "date": "2026-06-15",
                "fixdate": True,
                "reason": "public_holiday",
            }
        ]
    }
    verdict = try_story_lineup_deterministic_verdict(
        "**stories** always includes one **user_review** story with **fixdate** false.",
        payload,
    )
    assert verdict == (
        "fail",
        "Story lineup must include one user_review story with fixdate false.",
    )
