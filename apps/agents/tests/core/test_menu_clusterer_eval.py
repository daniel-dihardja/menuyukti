"""Tests for deterministic menu_clusterer milestone eval."""

from __future__ import annotations

from agents_app.agents.core.milestone_eval.menu_clusterer_eval import (
    enrich_menu_clusterer_eval_payload,
    try_menu_clusterer_deterministic_verdict,
)

_CLUSTER_DESCRIPTION = (
    "Deterministic signature cluster for Cafe Alto MAINS menu: star dishes by "
    "popularity (Ribeye, Burger). Grouped for the pinned signature carousel; aligns "
    "with weekday_lunch strategy."
)


def _signature_group(
    *,
    group_id: str = "group-signature-mains",
    lead_name: str = "Ribeye",
    items: list[dict] | None = None,
) -> dict:
    default_items = items or [
        {
            "name": "Ribeye",
            "role": "star",
            "category": "MAINS",
            "position": 1,
            "storytellingFit": "strong",
            "reelMoment": "static_hero",
            "popularity": 0.9,
        },
        {
            "name": "Burger",
            "role": "star",
            "category": "MAINS",
            "position": 2,
            "storytellingFit": "strong",
            "reelMoment": "static_hero",
            "popularity": 0.7,
        },
    ]
    return {
        "id": group_id,
        "leadName": lead_name,
        "profileId": "menu_highlight",
        "anchor": {"dimension": "reel_moment", "value": "static_hero"},
        "items": default_items,
        "mix": {
            "priceLevels": [],
            "storytellingStrongCount": 2,
            "starCount": 2,
            "puzzleCount": 0,
        },
        "clusterDescription": _CLUSTER_DESCRIPTION,
        "strategyFocus": "weekday_lunch",
    }


def _sample_payload() -> dict:
    return {
        "groups": [
            _signature_group(),
            _signature_group(
                group_id="group-signature-sides",
                lead_name="Fries",
                items=[
                    {
                        "name": "Fries",
                        "role": "star",
                        "category": "SIDES",
                        "position": 1,
                        "storytellingFit": "weak",
                        "reelMoment": "static_hero",
                        "popularity": 0.5,
                    }
                ],
            ),
        ],
        "unassignedItemNames": ["Wings"],
        "topFoodLeadNames": ["Ribeye", "Fries"],
        "targetGroupCount": 2,
        "sourceCampaignBriefTitle": "Campaign brief",
    }


def test_enrich_menu_clusterer_eval_payload_adds_hints() -> None:
    enriched = enrich_menu_clusterer_eval_payload(_sample_payload())
    assert enriched["_evalHints"]["minFoodGroups"] == 2
    assert enriched["_evalHints"]["topFoodLeadNames"] == ["Ribeye", "Fries"]


def test_prior_menu_tagger_verdict_passes() -> None:
    verdict = try_menu_clusterer_deterministic_verdict(
        "Run used a prior menu_tagger milestone with tagged items.",
        _sample_payload(),
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_signature_group_count_verdict_passes() -> None:
    verdict = try_menu_clusterer_deterministic_verdict(
        "Data includes one signature cluster per available category that has star items.",
        _sample_payload(),
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_signature_group_count_verdict_fails_when_mismatch() -> None:
    payload = _sample_payload()
    payload["targetGroupCount"] = 3
    verdict = try_menu_clusterer_deterministic_verdict(
        "Data includes one signature cluster per available category that has star items.",
        payload,
    )
    assert verdict is not None
    assert verdict[0] == "fail"


def test_prior_campaign_brief_verdict_passes() -> None:
    verdict = try_menu_clusterer_deterministic_verdict(
        "Run used a prior restaurant_campaign_brief milestone with saved strategy data.",
        _sample_payload(),
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_top_star_lead_verdict_passes() -> None:
    verdict = try_menu_clusterer_deterministic_verdict(
        "Each signature cluster's position-1 item is the top star in that category by popularity.",
        _sample_payload(),
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_top_star_lead_verdict_fails_when_lead_not_top_star() -> None:
    payload = _sample_payload()
    payload["groups"][0]["leadName"] = "Burger"
    verdict = try_menu_clusterer_deterministic_verdict(
        "Each signature cluster's position-1 item is the top star in that category by popularity.",
        payload,
    )
    assert verdict is not None
    assert verdict[0] == "fail"


def test_cluster_description_verdict_passes() -> None:
    verdict = try_menu_clusterer_deterministic_verdict(
        "Each signature cluster includes a clusterDescription explaining grouping rationale.",
        _sample_payload(),
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_cluster_description_verdict_fails_when_missing() -> None:
    payload = _sample_payload()
    payload["groups"][0]["clusterDescription"] = "too short"
    verdict = try_menu_clusterer_deterministic_verdict(
        "Each signature cluster includes a clusterDescription explaining grouping rationale.",
        payload,
    )
    assert verdict is not None
    assert verdict[0] == "fail"


def test_unassigned_items_verdict_passes_for_signature_model() -> None:
    verdict = try_menu_clusterer_deterministic_verdict(
        "Every tagged food item from menu tagger appears in at least one food cluster (no unassigned items).",
        _sample_payload(),
    )
    assert verdict is not None
    assert verdict[0] == "pass"
