"""Tests for deterministic menu_tagger milestone eval."""

from __future__ import annotations

from agents_app.agents.core.milestone_eval.menu_tagger_eval import (
    enrich_menu_tagger_eval_payload,
    try_menu_tagger_deterministic_verdict,
)


def _sample_payload() -> dict:
    return {
        "taxonomyVersion": "v2",
        "items": [
            {
                "name": "Nasi Goreng",
                "role": "star",
                "category": "Mains",
                "tags": {
                    "kind": "food",
                    "ingredient": ["rice"],
                    "taste": ["savory"],
                    "course": ["main"],
                    "reel_moment": "toss_stir",
                    "texture": [],
                    "prep_style": ["fried"],
                    "occasion": ["dinner"],
                    "serve_temp": "hot",
                    "content_angle": [],
                },
            }
        ],
        "usedTags": {
            "kind": ["food"],
            "ingredient": ["rice"],
            "taste": ["savory"],
            "course": ["main"],
            "reel_moment": ["toss_stir"],
            "texture": [],
            "prep_style": ["fried"],
            "occasion": ["dinner"],
            "serve_temp": ["hot"],
            "content_angle": [],
        },
    }


def test_enrich_menu_tagger_eval_payload_adds_hints() -> None:
    enriched = enrich_menu_tagger_eval_payload(_sample_payload())
    hints = enriched.get("_evalHints")
    assert isinstance(hints, dict)
    assert hints.get("emptyOptionalTagArraysAreValid") is True


def test_taxonomy_criterion_passes_with_empty_optional_arrays() -> None:
    verdict = try_menu_tagger_deterministic_verdict(
        "All tag values come from the fixed **v2 taxonomy** enums (no free-form tags).",
        _sample_payload(),
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_taxonomy_criterion_fails_on_invalid_enum() -> None:
    payload = _sample_payload()
    payload["items"][0]["tags"]["reel_moment"] = "not_a_hook"
    verdict = try_menu_tagger_deterministic_verdict(
        "All tag values come from the fixed **v2 taxonomy** enums (no free-form tags).",
        payload,
    )
    assert verdict is not None
    assert verdict[0] == "fail"


def test_all_items_tagged_criterion_passes() -> None:
    verdict = try_menu_tagger_deterministic_verdict(
        "Every promotion candidate item has required single-value tags (**kind**, **reel_moment**, **serve_temp**) and optional multi-value dimension arrays.",
        _sample_payload(),
    )
    assert verdict is not None
    assert verdict[0] == "pass"
