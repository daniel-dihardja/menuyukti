"""Tests for menu_clusterer clustering and graph nodes."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from agents_app.agents.core.milestone_run.menu_clusterer.cluster import (
    merge_llm_clusters,
    rank_top_food_leads,
)
from agents_app.agents.core.milestone_run.menu_clusterer.nodes import (
    MenuClustererClusterDraft,
    _menu_clusterer_draft_output_model,
    build_lineup,
    fetch_and_prepare,
    persist_result,
)
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output

_CLUSTER_DESCRIPTION = (
    "Groups signature mains for Cafe Alto weekday lunch workers using shared savory tags "
    "and reinforces the hero-dish pillar with a sizzle Reel hook."
)


def _food_tags(**overrides: object) -> dict:
    base = {
        "kind": "food",
        "ingredient": ["meat"],
        "taste": ["savory"],
        "course": ["main"],
        "reel_moment": "sizzle",
        "texture": ["juicy"],
        "prep_style": ["grilled"],
        "occasion": ["dinner"],
        "serve_temp": "hot",
        "content_angle": [],
    }
    base.update(overrides)
    return base


def _menu_tagger_items() -> list[dict]:
    return [
        {
            "name": "Ribeye",
            "role": "star",
            "category": "MAINS",
            "storytellingFit": "strong",
            "popularity": 0.9,
            "tags": _food_tags(),
        },
        {
            "name": "Burger",
            "role": "star",
            "category": "MAINS",
            "storytellingFit": "strong",
            "popularity": 0.7,
            "tags": _food_tags(ingredient=["bread"]),
        },
        {
            "name": "Wings",
            "role": "puzzle",
            "category": "MAINS",
            "storytellingFit": "weak",
            "popularity": 0.95,
            "tags": _food_tags(ingredient=["poultry"], reel_moment="toss_stir"),
        },
        {
            "name": "Salad",
            "role": "puzzle",
            "category": "MAINS",
            "storytellingFit": "weak",
            "popularity": 0.4,
            "tags": _food_tags(ingredient=["vegetable"], course=["side"]),
        },
        {
            "name": "Fries",
            "role": "puzzle",
            "category": "SIDES",
            "storytellingFit": "weak",
            "popularity": 0.5,
            "tags": _food_tags(ingredient=["potato"], course=["side"], reel_moment="static_hero"),
        },
    ]


def _campaign_brief_data() -> dict:
    return {
        "venueSnapshot": {
            "venueName": "Cafe Alto",
            "city": "Berlin",
            "country": "Germany",
            "currency": "EUR",
        },
        "overallStrategy": {
            "strategyFocus": "weekday_lunch",
            "audiencePriority": [
                "Weekday lunch nearby workers and office groups",
            ],
            "coreMessage": "Promote a repeatable weekday lunch offer for nearby workers and small groups.",
            "offerWindow": "11:00-14:00",
            "cadenceGuidance": [
                "Publish lunch-offer reels once per week on Tuesday.",
            ],
        },
        "contentPillars": ["Hero signatures", "Category variety", "Behind-the-scenes craft"],
        "audienceHypotheses": ["Lunch nearby workers"],
        "proofOrientedAngles": ["Top sellers lead conversions"],
        "toneGuardrails": ["Be specific"],
        "campaignObjective": "Increase reservations",
        "mainCategory": "Mains",
        "targetSegments": ["Weekday lunch workers"],
        "messageHierarchy": ["Hero promise"],
        "offerAndCtaPlan": ["Keep offers margin-safe"],
        "contentPillarPlan": ["Signature dishes via Reels"],
        "measurementPlan": ["Track saves weekly"],
        "testingPlan": ["Test lunch windows"],
        "riskGuardrails": ["Avoid unverified claims"],
    }


def _prior_json() -> str:
    return json.dumps(
        [
            {
                "title": "Campaign brief",
                "presetId": "restaurant_campaign_brief",
                "data": _campaign_brief_data(),
            },
            {
                "title": "Tagged menu",
                "presetId": "menu_tagger",
                "data": {"taxonomyVersion": "v2", "items": _menu_tagger_items(), "usedTags": {}},
            },
        ]
    )


def _draft_clusters() -> list[MenuClustererClusterDraft]:
    return [
        MenuClustererClusterDraft(
            themeLabel="Hero signatures",
            leadItemName="Wings",
            supportingItemNames=["Ribeye"],
            clusterDescription=_CLUSTER_DESCRIPTION,
        ),
        MenuClustererClusterDraft(
            themeLabel="Category variety",
            leadItemName="Ribeye",
            supportingItemNames=["Burger", "Fries"],
            clusterDescription=_CLUSTER_DESCRIPTION,
        ),
        MenuClustererClusterDraft(
            themeLabel="Proof angle",
            leadItemName="Burger",
            supportingItemNames=["Salad"],
            clusterDescription=_CLUSTER_DESCRIPTION,
        ),
        MenuClustererClusterDraft(
            themeLabel="Side pairings",
            leadItemName="Wings",
            supportingItemNames=["Fries", "Salad"],
            clusterDescription=_CLUSTER_DESCRIPTION,
        ),
    ]


def test_rank_top_food_leads_orders_by_popularity_and_storytelling() -> None:
    ranked = rank_top_food_leads(_menu_tagger_items())
    assert [item["name"] for item in ranked] == ["Wings", "Ribeye", "Burger", "Fries", "Salad"]


def test_merge_llm_clusters_builds_multi_item_groups_with_descriptions() -> None:
    top5 = rank_top_food_leads(_menu_tagger_items())
    payload = merge_llm_clusters(
        _draft_clusters(),
        menu_tagger_items=_menu_tagger_items(),
        top5_leads=top5,
        campaign_brief_data=_campaign_brief_data(),
        source_campaign_brief_title="Campaign brief",
    )
    normalized, error = validate_skill_output("menu_clusterer", payload)
    assert error is None
    assert isinstance(normalized, dict)
    assert len(normalized["groups"]) == 4
    assert normalized["drinkLeads"] == []
    assert normalized["drinkGroups"] == []
    assert normalized["topFoodLeadNames"] == ["Wings", "Ribeye", "Burger", "Fries", "Salad"]
    assert normalized["targetGroupCount"] == 4
    first = normalized["groups"][0]
    assert len(first["items"]) == 2
    assert first["items"][0]["position"] == 1
    assert first["clusterDescription"] == _CLUSTER_DESCRIPTION
    assert first["scheduleHints"]["preferredWeekdays"] == ["tuesday"]


def test_merge_llm_clusters_rejects_non_top5_lead_when_strict() -> None:
    items = _menu_tagger_items() + [
        {
            "name": "Soup",
            "role": "puzzle",
            "category": "MAINS",
            "storytellingFit": "weak",
            "popularity": 0.1,
            "tags": _food_tags(reel_moment="steam", course=["appetizer"]),
        },
    ]
    top5 = rank_top_food_leads(items)
    clusters = _draft_clusters()
    clusters[0] = MenuClustererClusterDraft(
        themeLabel="Invalid",
        leadItemName="Soup",
        supportingItemNames=[],
        clusterDescription=_CLUSTER_DESCRIPTION,
    )
    with pytest.raises(ValueError, match="top-5"):
        merge_llm_clusters(
            clusters,
            menu_tagger_items=items,
            top5_leads=top5,
            strict_top5_leads=True,
        )


def test_merge_llm_clusters_auto_corrects_non_top5_lead() -> None:
    items = _menu_tagger_items() + [
        {
            "name": "Soup",
            "role": "puzzle",
            "category": "MAINS",
            "storytellingFit": "weak",
            "popularity": 0.1,
            "tags": _food_tags(reel_moment="steam", course=["appetizer"]),
        },
    ]
    top5 = rank_top_food_leads(items)
    clusters = _draft_clusters()
    clusters[0] = MenuClustererClusterDraft(
        themeLabel="Invalid",
        leadItemName="Soup",
        supportingItemNames=[],
        clusterDescription=_CLUSTER_DESCRIPTION,
    )
    payload = merge_llm_clusters(
        clusters,
        menu_tagger_items=items,
        top5_leads=top5,
    )
    assert payload["groups"][0]["leadName"] in [item["name"] for item in top5]


@pytest.mark.asyncio
async def test_fetch_and_prepare_requires_menu_tagger() -> None:
    with (
        patch(
            "agents_app.agents.core.milestone_run.menu_clusterer.nodes.get_stream_writer",
            return_value=lambda _x: None,
        ),
        pytest.raises(ValueError, match="menu_tagger"),
    ):
        await fetch_and_prepare(
            {
                "milestone_id": "m1",
                "location_id": 1,
                "user_id": "u1",
                "goal": "",
                "criteria": [],
                "prior_milestones_data": json.dumps(
                    [
                        {
                            "title": "Campaign brief",
                            "presetId": "restaurant_campaign_brief",
                            "data": _campaign_brief_data(),
                        }
                    ]
                ),
                "result_data": "",
                "milestonedata_written": False,
            },
            client=MagicMock(),
        )


@pytest.mark.asyncio
async def test_fetch_and_prepare_requires_campaign_brief() -> None:
    with (
        patch(
            "agents_app.agents.core.milestone_run.menu_clusterer.nodes.get_stream_writer",
            return_value=lambda _x: None,
        ),
        pytest.raises(ValueError, match="restaurant_campaign_brief"),
    ):
        await fetch_and_prepare(
            {
                "milestone_id": "m1",
                "location_id": 1,
                "user_id": "u1",
                "goal": "",
                "criteria": [],
                "prior_milestones_data": json.dumps(
                    [
                        {
                            "title": "Tagged menu",
                            "presetId": "menu_tagger",
                            "data": {
                                "taxonomyVersion": "v2",
                                "items": _menu_tagger_items(),
                                "usedTags": {},
                            },
                        }
                    ]
                ),
                "result_data": "",
                "milestonedata_written": False,
            },
            client=MagicMock(),
        )


@pytest.mark.asyncio
async def test_build_lineup_and_persist() -> None:
    draft_model = _menu_clusterer_draft_output_model(4)
    draft = draft_model(clusters=_draft_clusters())
    state = {
        "milestone_id": "m1",
        "location_id": 1,
        "user_id": "u1",
        "goal": "",
        "criteria": [],
        "campaign_brief_data": _campaign_brief_data(),
        "source_campaign_brief_title": "Campaign brief",
        "menu_tagger_items": _menu_tagger_items(),
        "source_menu_tagger_title": "Tagged menu",
        "owner_notes_markdown": "",
        "result_data": "",
        "milestonedata_written": False,
    }
    with (
        patch(
            "agents_app.agents.core.milestone_run.menu_clusterer.nodes.get_stream_writer",
            return_value=lambda _x: None,
        ),
        patch(
            "agents_app.agents.core.milestone_run.menu_clusterer.nodes.structured_ainvoke_from_run_config",
            new=AsyncMock(return_value=draft),
        ),
    ):
        built = await build_lineup(state)  # type: ignore[arg-type]
    assert len(built["generated_output"]["groups"]) == 4
    assert built["generated_output"]["groups"][0]["scheduleHints"]["preferredTime"] == "11:00"

    with patch(
        "agents_app.agents.core.milestone_run.menu_clusterer.nodes.upsert_milestonedata_node",
        new=AsyncMock(),
    ) as upsert:
        saved = await persist_result({**state, **built}, client=MagicMock())  # type: ignore[arg-type]
        upsert.assert_awaited_once()
    assert saved["milestonedata_written"] is True
