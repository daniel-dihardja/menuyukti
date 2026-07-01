"""Tests for deterministic menu_clusterer milestone eval."""

from __future__ import annotations

from agents_app.agents.core.milestone_eval.menu_clusterer_eval import (
    enrich_menu_clusterer_eval_payload,
    try_menu_clusterer_deterministic_verdict,
)

_CLUSTER_DESCRIPTION = (
    "Deterministic Top 5 cluster for Cafe Alto MAINS menu: top star dishes by "
    "popularity (Ribeye, Burger). Grouped for the feed carousel Top 5 post; aligns "
    "with weekday_lunch strategy."
)

_HOOK_CLUSTER_DESCRIPTION = (
    "Groups signature mains for Cafe Alto weekday lunch workers using shared savory tags "
    "and reinforces the hero-dish pillar with a sizzle Reel hook."
)


def _top_five_group(
    *,
    group_id: str = "group-top-five-mains",
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
        "profileId": "top_five",
        "category": "MAINS" if group_id.endswith("mains") else "SIDES",
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


def _hook_group(*, group_id: str = "group-1", lead_name: str = "Wings") -> dict:
    return {
        "id": group_id,
        "leadName": lead_name,
        "profileId": "hook_reel",
        "anchor": {"dimension": "reel_moment", "value": "sizzle"},
        "items": [
            {
                "name": lead_name,
                "role": "puzzle",
                "category": "MAINS",
                "position": 1,
                "storytellingFit": "weak",
                "reelMoment": "sizzle",
                "popularity": 0.95,
            },
            {
                "name": "Ribeye",
                "role": "star",
                "category": "MAINS",
                "position": 2,
                "storytellingFit": "strong",
                "reelMoment": "sizzle",
                "popularity": 0.9,
            },
        ],
        "mix": {
            "priceLevels": [],
            "storytellingStrongCount": 1,
            "starCount": 1,
            "puzzleCount": 1,
        },
        "clusterDescription": _HOOK_CLUSTER_DESCRIPTION,
        "strategyFocus": "weekday_lunch",
    }


def _sample_payload(*, hybrid: bool = False) -> dict:
    groups = [
        _top_five_group(),
        _top_five_group(
            group_id="group-top-five-sides",
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
    ]
    groups[1]["category"] = "SIDES"
    if hybrid:
        groups.extend(
            [
                _hook_group(group_id="group-1", lead_name="Wings"),
                _hook_group(group_id="group-2", lead_name="Ribeye"),
                _hook_group(group_id="group-3", lead_name="Burger"),
                _hook_group(group_id="group-4", lead_name="Fries"),
            ]
        )
    food_leads = []
    if hybrid:
        food_leads = [
            {"name": "Wings", "role": "puzzle", "category": "MAINS", "tags": {"kind": "food"}},
            {"name": "Ribeye", "role": "star", "category": "MAINS", "tags": {"kind": "food"}},
            {"name": "Burger", "role": "star", "category": "MAINS", "tags": {"kind": "food"}},
            {"name": "Fries", "role": "star", "category": "SIDES", "tags": {"kind": "food"}},
        ]
    return {
        "groups": groups,
        "foodLeads": food_leads,
        "unassignedItemNames": [] if hybrid else ["Wings"],
        "topFoodLeadNames": ["Wings", "Ribeye", "Burger", "Fries", "Salad"],
        "targetGroupCount": 4 if hybrid else 2,
        "topFiveGroupCount": 2,
        "sourceCampaignBriefTitle": "Campaign brief",
    }


def test_enrich_menu_clusterer_eval_payload_adds_hints() -> None:
    enriched = enrich_menu_clusterer_eval_payload(_sample_payload(hybrid=True))
    assert enriched["_evalHints"]["minFoodGroups"] == 4
    assert enriched["_evalHints"]["topFiveGroupCount"] == 2
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
        _sample_payload(hybrid=True),
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_hybrid_group_count_verdict_passes() -> None:
    verdict = try_menu_clusterer_deterministic_verdict(
        "Data includes the derived number of food Reel hook clusters (4-8) and one "
        "top five group per available category that has star items.",
        _sample_payload(hybrid=True),
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_hybrid_group_count_verdict_fails_when_hook_mismatch() -> None:
    payload = _sample_payload(hybrid=True)
    payload["groups"] = payload["groups"][:3]
    verdict = try_menu_clusterer_deterministic_verdict(
        "Data includes the derived number of food Reel hook clusters (4-8) and one "
        "top five group per available category that has star items.",
        payload,
    )
    assert verdict is not None
    assert verdict[0] == "fail"


def test_top_five_only_group_count_verdict_passes() -> None:
    verdict = try_menu_clusterer_deterministic_verdict(
        "Data includes one top five group per available category that has star items.",
        _sample_payload(),
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_prior_campaign_brief_verdict_passes() -> None:
    verdict = try_menu_clusterer_deterministic_verdict(
        "Run used a prior restaurant_campaign_brief milestone with saved strategy data.",
        _sample_payload(hybrid=True),
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_hybrid_top_lead_verdict_passes() -> None:
    verdict = try_menu_clusterer_deterministic_verdict(
        "Each hook Reel cluster's position-1 item is in the top popularity score-tier "
        "(top five scores; storytelling breaks ties among same score). Each top five "
        "group's position-1 item is the top star in that category by popularity.",
        _sample_payload(hybrid=True),
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_top_five_only_top_lead_verdict_ignores_hook_groups() -> None:
    payload = _sample_payload(hybrid=True)
    payload["groups"][2]["leadName"] = "Salad"
    payload["groups"][2]["items"][0]["name"] = "Salad"
    verdict = try_menu_clusterer_deterministic_verdict(
        "Each top five group's position-1 item is the top star in that category by popularity.",
        payload,
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_hook_only_top_lead_verdict_fails_when_hook_lead_not_in_top_five() -> None:
    payload = _sample_payload(hybrid=True)
    payload["groups"][2]["leadName"] = "Mystery Soup"
    payload["groups"][2]["items"][0]["name"] = "Mystery Soup"
    verdict = try_menu_clusterer_deterministic_verdict(
        "Each hook Reel cluster's position-1 item is in the top popularity score-tier.",
        payload,
    )
    assert verdict is not None
    assert verdict[0] == "fail"


def test_top_five_top_star_lead_verdict_fails_when_lead_not_top_star() -> None:
    payload = _sample_payload()
    payload["groups"][0]["leadName"] = "Burger"
    verdict = try_menu_clusterer_deterministic_verdict(
        "Each top five group's position-1 item is the top star in that category by popularity.",
        payload,
    )
    assert verdict is not None
    assert verdict[0] == "fail"


def test_cluster_description_verdict_passes() -> None:
    verdict = try_menu_clusterer_deterministic_verdict(
        "Each cluster includes a clusterDescription explaining grouping rationale.",
        _sample_payload(hybrid=True),
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_cluster_description_verdict_fails_when_missing() -> None:
    payload = _sample_payload(hybrid=True)
    payload["groups"][0]["clusterDescription"] = "too short"
    verdict = try_menu_clusterer_deterministic_verdict(
        "Each cluster includes a clusterDescription explaining grouping rationale.",
        payload,
    )
    assert verdict is not None
    assert verdict[0] == "fail"


def test_unassigned_items_verdict_passes_for_hybrid() -> None:
    verdict = try_menu_clusterer_deterministic_verdict(
        "Every tagged food item from menu tagger appears in at least one food cluster "
        "(no unassigned items).",
        _sample_payload(hybrid=True),
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_unassigned_items_verdict_passes_for_top_five_only() -> None:
    verdict = try_menu_clusterer_deterministic_verdict(
        "Every tagged food item from menu tagger appears in at least one food cluster "
        "(no unassigned items).",
        _sample_payload(),
    )
    assert verdict is not None
    assert verdict[0] == "pass"
