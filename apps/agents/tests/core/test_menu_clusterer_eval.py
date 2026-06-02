"""Tests for deterministic menu_clusterer milestone eval."""

from __future__ import annotations

from agents_app.agents.core.milestone_eval.menu_clusterer_eval import (
    enrich_menu_clusterer_eval_payload,
    try_menu_clusterer_deterministic_verdict,
)

_CLUSTER_DESCRIPTION = (
    "Groups Ribeye with grilled sides because they share savory hot main tags and fit "
    "Cafe Alto weekday lunch hero positioning for workers in Berlin."
)


def _sample_payload() -> dict:
    return {
        "groups": [
            {
                "id": "group-1",
                "leadName": "Ribeye",
                "profileId": "hook_reel",
                "anchor": {"dimension": "reel_moment", "value": "sizzle"},
                "items": [
                    {
                        "name": "Ribeye",
                        "role": "star",
                        "category": "MAINS",
                        "position": 1,
                        "storytellingFit": "strong",
                        "reelMoment": "sizzle",
                    },
                    {
                        "name": "Burger",
                        "role": "star",
                        "category": "MAINS",
                        "position": 2,
                        "storytellingFit": "strong",
                        "reelMoment": "sizzle",
                    },
                ],
                "mix": {
                    "priceLevels": [],
                    "storytellingStrongCount": 2,
                    "starCount": 2,
                    "puzzleCount": 0,
                },
                "clusterDescription": _CLUSTER_DESCRIPTION,
                "strategyFocus": "weekday_lunch",
            },
            *_extra_groups(),
        ],
        "unassignedItemNames": ["Wings"],
        "topFoodLeadNames": ["Wings", "Ribeye", "Burger", "Fries", "Salad"],
        "sourceCampaignBriefTitle": "Campaign brief",
    }


def _extra_groups() -> list[dict]:
    groups = []
    for index, lead in enumerate(["Burger", "Wings", "Fries"], start=2):
        groups.append(
            {
                "id": f"group-{index}",
                "leadName": lead,
                "profileId": "hook_reel",
                "anchor": {"dimension": "reel_moment", "value": "sizzle"},
                "items": [
                    {
                        "name": lead,
                        "role": "star",
                        "category": "MAINS",
                        "position": 1,
                        "storytellingFit": "strong",
                        "reelMoment": "sizzle",
                    },
                ],
                "mix": {
                    "priceLevels": [],
                    "storytellingStrongCount": 1,
                    "starCount": 1,
                    "puzzleCount": 0,
                },
                "clusterDescription": _CLUSTER_DESCRIPTION,
                "strategyFocus": "weekday_lunch",
            }
        )
    return groups


def test_enrich_menu_clusterer_eval_payload_adds_hints() -> None:
    enriched = enrich_menu_clusterer_eval_payload(_sample_payload())
    assert enriched["_evalHints"]["minFoodGroups"] == 4
    assert enriched["_evalHints"]["topFoodLeadNames"] == [
        "Wings",
        "Ribeye",
        "Burger",
        "Fries",
        "Salad",
    ]


def test_prior_menu_tagger_verdict_passes() -> None:
    verdict = try_menu_clusterer_deterministic_verdict(
        "Run used a prior menu_tagger milestone with tagged items.",
        _sample_payload(),
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_min_four_groups_verdict_passes() -> None:
    verdict = try_menu_clusterer_deterministic_verdict(
        "Data includes at least 4 food Reel clusters.",
        _sample_payload(),
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_min_groups_verdict_uses_target_group_count_from_data() -> None:
    payload = _sample_payload()
    payload["targetGroupCount"] = 6
    payload["groups"] = payload["groups"][:5]
    verdict = try_menu_clusterer_deterministic_verdict(
        "Data includes the configured number of food Reel clusters (minimum 4, from Input tab target group count).",
        payload,
    )
    assert verdict is not None
    assert verdict[0] == "fail"

    payload["groups"] = _sample_payload()["groups"] + _extra_groups()
    payload["groups"] = payload["groups"][:6]
    verdict = try_menu_clusterer_deterministic_verdict(
        "Data includes the configured number of food Reel clusters (minimum 4, from Input tab target group count).",
        payload,
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_min_four_groups_verdict_fails() -> None:
    payload = _sample_payload()
    payload["groups"] = payload["groups"][:2]
    verdict = try_menu_clusterer_deterministic_verdict(
        "Data includes at least 4 food Reel clusters.",
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


def test_top_five_lead_verdict_passes() -> None:
    verdict = try_menu_clusterer_deterministic_verdict(
        "Each food cluster's position-1 item is a top-5 food item by popularity.",
        _sample_payload(),
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_cluster_description_verdict_passes() -> None:
    verdict = try_menu_clusterer_deterministic_verdict(
        "Each food cluster includes a clusterDescription explaining grouping rationale.",
        _sample_payload(),
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_cluster_description_verdict_fails_when_missing() -> None:
    payload = _sample_payload()
    payload["groups"][0]["clusterDescription"] = "too short"
    verdict = try_menu_clusterer_deterministic_verdict(
        "Each food cluster includes a clusterDescription explaining grouping rationale.",
        payload,
    )
    assert verdict is not None
    assert verdict[0] == "fail"


def test_multi_item_group_passes_top_five_check() -> None:
    verdict = try_menu_clusterer_deterministic_verdict(
        "Each food cluster's position-1 item is a top-5 food item by popularity.",
        _sample_payload(),
    )
    assert verdict is not None
    assert verdict[0] == "pass"
