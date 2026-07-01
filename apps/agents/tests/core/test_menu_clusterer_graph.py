"""Tests for menu_clusterer clustering and graph nodes."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from agents_app.agents.core.milestone_run.menu_clusterer.cluster import (
    MENU_CLUSTERER_PROFILE_TOP_FIVE,
    build_per_category_top_five_clusters,
    combine_hybrid_clusterer_output,
    derive_hook_cluster_split,
    derive_target_group_count,
    distinct_categories_with_clusterable_items,
    distinct_categories_with_stars,
    is_mixed_category_group,
    is_same_category_group,
    menu_highlight_eligible_items,
    merge_llm_clusters,
    rank_top_food_leads,
    resolve_target_group_count,
    select_category_star_items,
    select_menu_highlight_items,
    select_top_popularity_food_by_score_rank,
)
from agents_app.agents.core.milestone_run.menu_clusterer.nodes import (
    MenuClustererClusterDraft,
    _menu_clusterer_draft_output_model,
    build_clusters,
    fetch_and_prepare,
    persist_result,
)
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output

_CLUSTER_DESCRIPTION = (
    "Groups signature mains for Cafe Alto weekday lunch workers using shared savory tags "
    "and reinforces the hero-dish pillar with a sizzle Reel hook."
)


class _ClusterDraft:
    def __init__(
        self,
        *,
        themeLabel: str,
        categoryScope: str,
        leadItemName: str,
        supportingItemNames: list[str],
        clusterDescription: str,
    ) -> None:
        self.themeLabel = themeLabel
        self.categoryScope = categoryScope
        self.leadItemName = leadItemName
        self.supportingItemNames = supportingItemNames
        self.clusterDescription = clusterDescription


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


def _drink_tags(**overrides: object) -> dict:
    base = {
        "kind": "drink",
        "ingredient": ["coffee"],
        "taste": ["sweet"],
        "course": ["beverage"],
        "reel_moment": "pour",
        "texture": ["silky"],
        "prep_style": ["poured"],
        "occasion": ["brunch"],
        "serve_temp": "hot",
        "content_angle": [],
    }
    base.update(overrides)
    return base


def _drink_menu_tagger_items() -> list[dict]:
    return [
        {
            "name": "Espresso",
            "role": "star",
            "category": "DRINK",
            "storytellingFit": "strong",
            "popularity": 0.9,
            "tags": _drink_tags(),
        },
        {
            "name": "Latte",
            "role": "star",
            "category": "DRINK",
            "storytellingFit": "strong",
            "popularity": 0.8,
            "tags": _drink_tags(ingredient=["dairy"]),
        },
        {
            "name": "Iced Tea",
            "role": "star",
            "category": "DRINK",
            "storytellingFit": "weak",
            "popularity": 0.7,
            "tags": _drink_tags(ingredient=["tea"], serve_temp="cold"),
        },
        {
            "name": "Matcha",
            "role": "puzzle",
            "category": "DRINK",
            "storytellingFit": "weak",
            "popularity": 0.6,
            "tags": _drink_tags(ingredient=["tea"], reel_moment="bubble_fizz"),
        },
    ]


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
            "role": "star",
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
            themeLabel="Savory mains lineup",
            categoryScope="categorical",
            leadItemName="Wings",
            supportingItemNames=["Ribeye", "Burger"],
            clusterDescription=_CLUSTER_DESCRIPTION,
        ),
        MenuClustererClusterDraft(
            themeLabel="Sides spotlight",
            categoryScope="categorical",
            leadItemName="Fries",
            supportingItemNames=[],
            clusterDescription=_CLUSTER_DESCRIPTION,
        ),
        MenuClustererClusterDraft(
            themeLabel="Main with side pairing",
            categoryScope="creative",
            leadItemName="Burger",
            supportingItemNames=["Fries", "Salad"],
            clusterDescription=_CLUSTER_DESCRIPTION,
        ),
        MenuClustererClusterDraft(
            themeLabel="Cross-category proof",
            categoryScope="creative",
            leadItemName="Wings",
            supportingItemNames=["Fries"],
            clusterDescription=_CLUSTER_DESCRIPTION,
        ),
    ]


def test_menu_clusterer_cluster_draft_truncates_extra_supporting_items() -> None:
    draft = MenuClustererClusterDraft(
        themeLabel="Large cluster",
        categoryScope="categorical",
        leadItemName="Ribeye",
        supportingItemNames=[
            "A",
            "B",
            "C",
            "D",
            "E",
            "F",
        ],
        clusterDescription=_CLUSTER_DESCRIPTION,
    )
    assert draft.supportingItemNames == ["A", "B", "C", "D"]


def test_derive_target_group_count_scales_with_menu_size() -> None:
    assert derive_target_group_count(4) == 4
    assert derive_target_group_count(16) == 4
    assert derive_target_group_count(20) == 5
    assert derive_target_group_count(48) == 12


def test_resolve_target_group_count_honors_milestone_input() -> None:
    assert resolve_target_group_count(8, food_item_count=30) == 8
    assert resolve_target_group_count(20, food_item_count=30) == 12
    assert resolve_target_group_count(None, food_item_count=20) == 5


def test_derive_hook_cluster_split_single_category() -> None:
    same, mixed = derive_hook_cluster_split(4, ["MAINS"])
    assert same == 4
    assert mixed == 0


def test_derive_hook_cluster_split_multiple_categories() -> None:
    same, mixed = derive_hook_cluster_split(4, ["MAINS", "SIDES"])
    assert same == 2
    assert mixed == 2


def test_distinct_categories_with_clusterable_items_includes_puzzles() -> None:
    categories = distinct_categories_with_clusterable_items(
        _menu_tagger_items(),
        main_category="Mains",
    )
    assert categories == ["MAINS", "SIDES"]


def test_merge_llm_clusters_validates_category_scope_from_tags() -> None:
    top5 = rank_top_food_leads(_menu_tagger_items())
    payload = merge_llm_clusters(
        _draft_clusters(),
        menu_tagger_items=_menu_tagger_items(),
        top5_leads=top5,
        campaign_brief_data=_campaign_brief_data(),
        target_group_count=4,
        include_menu_highlight=False,
        pos_categories=["MAINS", "SIDES"],
    )
    hook_groups = [group for group in payload["groups"] if group.get("profileId") == "hook_reel"]
    assert len(hook_groups) == 4
    assert any(is_same_category_group(group) for group in hook_groups)
    assert any(is_mixed_category_group(group) for group in hook_groups)


def test_combine_hybrid_clusterer_output_merges_top_five_and_hook_groups() -> None:
    top5 = rank_top_food_leads(_menu_tagger_items())
    hook_payload = merge_llm_clusters(
        _draft_clusters(),
        menu_tagger_items=_menu_tagger_items(),
        top5_leads=top5,
        campaign_brief_data=_campaign_brief_data(),
        target_group_count=4,
        include_menu_highlight=False,
        pos_categories=["MAINS", "SIDES"],
    )
    top_five_payload = build_per_category_top_five_clusters(
        _menu_tagger_items(),
        campaign_brief_data=_campaign_brief_data(),
    )
    payload = combine_hybrid_clusterer_output(
        hook_payload=hook_payload,
        top_five_payload=top_five_payload,
        menu_tagger_items=_menu_tagger_items(),
    )
    normalized, error = validate_skill_output("menu_clusterer", payload)
    assert error is None
    assert isinstance(normalized, dict)
    assert len(normalized["groups"]) == 6
    assert normalized["targetGroupCount"] == 4
    assert normalized["topFiveGroupCount"] == 2
    assert normalized["groups"][0]["profileId"] == MENU_CLUSTERER_PROFILE_TOP_FIVE
    assert normalized["groups"][2]["profileId"] == "hook_reel"
    assert len(normalized["foodLeads"]) == 4
    assert normalized["unassignedItemNames"] == []


def test_combine_hybrid_clusterer_output_normalizes_top_five_item_order() -> None:
    top5 = rank_top_food_leads(_menu_tagger_items())
    hook_payload = merge_llm_clusters(
        _draft_clusters(),
        menu_tagger_items=_menu_tagger_items(),
        top5_leads=top5,
        campaign_brief_data=_campaign_brief_data(),
        target_group_count=4,
        include_menu_highlight=False,
        pos_categories=["MAINS", "SIDES"],
    )
    top_five_payload = build_per_category_top_five_clusters(
        _menu_tagger_items(),
        campaign_brief_data=_campaign_brief_data(),
    )
    top_five_payload["groups"][0]["items"] = list(reversed(top_five_payload["groups"][0]["items"]))
    top_five_payload["groups"][0]["leadName"] = top_five_payload["groups"][0]["items"][0]["name"]
    payload = combine_hybrid_clusterer_output(
        hook_payload=hook_payload,
        top_five_payload=top_five_payload,
        menu_tagger_items=_menu_tagger_items(),
    )
    mains = payload["groups"][0]
    assert mains["leadName"] == "Ribeye"
    assert [row["name"] for row in mains["items"]] == ["Ribeye", "Burger"]


def test_distinct_categories_with_stars_orders_main_category_first() -> None:
    categories = distinct_categories_with_stars(_menu_tagger_items(), main_category="Mains")
    assert categories == ["MAINS", "SIDES"]


def test_select_category_star_items_excludes_puzzles() -> None:
    mains = select_category_star_items(_menu_tagger_items(), "MAINS")
    assert [item["name"] for item in mains] == ["Ribeye", "Burger"]


def test_build_per_category_top_five_clusters_single_category() -> None:
    food_only = [item for item in _menu_tagger_items() if item["category"] == "MAINS"]
    payload = build_per_category_top_five_clusters(
        food_only,
        campaign_brief_data=_campaign_brief_data(),
        source_campaign_brief_title="Campaign brief",
    )
    normalized, error = validate_skill_output("menu_clusterer", payload)
    assert error is None
    assert isinstance(normalized, dict)
    assert len(normalized["groups"]) == 1
    assert normalized["targetGroupCount"] == 1
    group = normalized["groups"][0]
    assert group["id"] == "group-top-five-mains"
    assert group["profileId"] == MENU_CLUSTERER_PROFILE_TOP_FIVE
    assert group["category"] == "MAINS"
    assert group["creativeRole"] == "top_five"
    assert [row["name"] for row in group["items"]] == ["Ribeye", "Burger"]
    assert normalized["unassignedItemNames"] == ["Wings", "Salad"]
    assert normalized["topFoodLeadNames"] == ["Ribeye"]
    assert normalized["topFiveGroupCount"] == 1


def test_build_per_category_top_five_clusters_multiple_categories() -> None:
    payload = build_per_category_top_five_clusters(
        _menu_tagger_items(),
        campaign_brief_data=_campaign_brief_data(),
    )
    normalized, error = validate_skill_output("menu_clusterer", payload)
    assert error is None
    assert isinstance(normalized, dict)
    assert len(normalized["groups"]) == 2
    assert normalized["targetGroupCount"] == 2
    assert normalized["groups"][0]["id"] == "group-top-five-mains"
    assert normalized["groups"][1]["id"] == "group-top-five-sides"
    assigned = {item["name"] for group in normalized["groups"] for item in group["items"]}
    assert assigned == {"Ribeye", "Burger", "Fries"}


def test_build_per_category_top_five_clusters_requires_stars() -> None:
    puzzles_only = [
        {
            "name": "Wings",
            "role": "puzzle",
            "category": "MAINS",
            "storytellingFit": "weak",
            "popularity": 0.95,
            "tags": _food_tags(),
        }
    ]
    with pytest.raises(ValueError, match="star item"):
        build_per_category_top_five_clusters(puzzles_only)


def test_rank_top_food_leads_orders_by_popularity_and_storytelling() -> None:
    ranked = rank_top_food_leads(_menu_tagger_items())
    assert [item["name"] for item in ranked] == ["Wings", "Ribeye", "Burger", "Fries", "Salad"]


def test_select_top_popularity_food_by_score_rank_includes_ties_at_fifth_score() -> None:
    items = [
        {
            "name": "Alpha",
            "role": "star",
            "category": "MAINS",
            "storytellingFit": "strong",
            "popularity": 0.9,
            "tags": _food_tags(),
        },
        {
            "name": "Beta",
            "role": "star",
            "category": "MAINS",
            "storytellingFit": "strong",
            "popularity": 0.8,
            "tags": _food_tags(),
        },
        {
            "name": "Gamma",
            "role": "star",
            "category": "MAINS",
            "storytellingFit": "weak",
            "popularity": 0.7,
            "tags": _food_tags(),
        },
        {
            "name": "Delta",
            "role": "puzzle",
            "category": "MAINS",
            "storytellingFit": "weak",
            "popularity": 0.6,
            "tags": _food_tags(),
        },
        {
            "name": "Fries",
            "role": "puzzle",
            "category": "SIDES",
            "storytellingFit": "weak",
            "popularity": 0.5,
            "tags": _food_tags(),
        },
        {
            "name": "Taco",
            "role": "star",
            "category": "MAINS",
            "storytellingFit": "weak",
            "popularity": 0.5,
            "tags": _food_tags(reel_moment="static_hero"),
        },
        {
            "name": "Salad",
            "role": "puzzle",
            "category": "MAINS",
            "storytellingFit": "weak",
            "popularity": 0.4,
            "tags": _food_tags(course=["side"]),
        },
    ]
    selected = select_top_popularity_food_by_score_rank(items)
    names = [item["name"] for item in selected]
    assert "Fries" in names
    assert "Taco" in names
    assert "Salad" not in names
    assert len(names) == 6


def test_menu_highlight_eligible_items_requires_food_main_course() -> None:
    items = _menu_tagger_items()
    eligible = menu_highlight_eligible_items(items)
    names = {item["name"] for item in eligible}
    assert names == {"Ribeye", "Burger", "Wings"}
    assert "Fries" not in names


def test_select_menu_highlight_includes_all_mains_at_top_score_tiers() -> None:
    items = _menu_tagger_items() + [
        {
            "name": "Taco",
            "role": "star",
            "category": "MAINS",
            "storytellingFit": "weak",
            "popularity": 0.5,
            "tags": _food_tags(),
        },
    ]
    selected = select_menu_highlight_items(items)
    names = [item["name"] for item in selected]
    assert names == ["Wings", "Ribeye", "Burger", "Taco"]


def test_merge_llm_clusters_legacy_path_still_builds_hook_groups() -> None:
    top5 = rank_top_food_leads(_menu_tagger_items())
    clusters = [
        _ClusterDraft(
            themeLabel="Hero signatures",
            categoryScope="categorical",
            leadItemName="Ribeye",
            supportingItemNames=["Burger"],
            clusterDescription=_CLUSTER_DESCRIPTION,
        ),
        _ClusterDraft(
            themeLabel="Category variety",
            categoryScope="creative",
            leadItemName="Burger",
            supportingItemNames=["Fries"],
            clusterDescription=_CLUSTER_DESCRIPTION,
        ),
        _ClusterDraft(
            themeLabel="Proof angle",
            categoryScope="categorical",
            leadItemName="Ribeye",
            supportingItemNames=["Salad"],
            clusterDescription=_CLUSTER_DESCRIPTION,
        ),
        _ClusterDraft(
            themeLabel="Side pairings",
            categoryScope="categorical",
            leadItemName="Fries",
            supportingItemNames=[],
            clusterDescription=_CLUSTER_DESCRIPTION,
        ),
    ]
    payload = merge_llm_clusters(
        clusters,
        menu_tagger_items=_menu_tagger_items(),
        top5_leads=top5,
        campaign_brief_data=_campaign_brief_data(),
        target_group_count=4,
    )
    hook_groups = [group for group in payload["groups"] if group.get("profileId") == "hook_reel"]
    assert len(hook_groups) == 4


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
async def test_fetch_and_prepare_requires_star_items() -> None:
    puzzles_only = [
        {
            "name": "Wings",
            "role": "puzzle",
            "category": "MAINS",
            "storytellingFit": "weak",
            "popularity": 0.95,
            "tags": _food_tags(),
        }
    ]
    with (
        patch(
            "agents_app.agents.core.milestone_run.menu_clusterer.nodes.get_stream_writer",
            return_value=lambda _x: None,
        ),
        pytest.raises(ValueError, match="star item"),
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
                        },
                        {
                            "title": "Tagged menu",
                            "presetId": "menu_tagger",
                            "data": {
                                "taxonomyVersion": "v2",
                                "items": puzzles_only,
                                "usedTags": {},
                            },
                        },
                    ]
                ),
                "result_data": "",
                "milestonedata_written": False,
            },
            client=MagicMock(),
        )


@pytest.mark.asyncio
async def test_fetch_and_prepare_sets_hook_and_top_five_group_counts() -> None:
    with patch(
        "agents_app.agents.core.milestone_run.menu_clusterer.nodes.get_stream_writer",
        return_value=lambda _x: None,
    ):
        prepared = await fetch_and_prepare(
            {
                "milestone_id": "m1",
                "location_id": 1,
                "user_id": "u1",
                "goal": "",
                "criteria": [],
                "prior_milestones_data": _prior_json(),
                "result_data": "",
                "milestonedata_written": False,
            },
            client=MagicMock(),
        )
    assert prepared["target_group_count"] == 4
    assert prepared["top_five_group_count"] == 2


@pytest.mark.asyncio
async def test_fetch_and_prepare_uses_configured_target_group_count() -> None:
    with patch(
        "agents_app.agents.core.milestone_run.menu_clusterer.nodes.get_stream_writer",
        return_value=lambda _x: None,
    ):
        prepared = await fetch_and_prepare(
            {
                "milestone_id": "m1",
                "location_id": 1,
                "user_id": "u1",
                "goal": "",
                "criteria": [],
                "prior_milestones_data": _prior_json(),
                "milestone_input": {
                    "type": "menu_clusterer",
                    "value": {"notes": "more granular", "targetGroupCount": 8},
                },
                "result_data": "",
                "milestonedata_written": False,
            },
            client=MagicMock(),
        )
    assert prepared["target_group_count"] == 5


@pytest.mark.asyncio
async def test_fetch_and_prepare_counts_drink_tagged_items() -> None:
    with patch(
        "agents_app.agents.core.milestone_run.menu_clusterer.nodes.get_stream_writer",
        return_value=lambda _x: None,
    ):
        prepared = await fetch_and_prepare(
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
                        },
                        {
                            "title": "Tagged menu",
                            "presetId": "menu_tagger",
                            "data": {
                                "taxonomyVersion": "v2",
                                "items": _drink_menu_tagger_items(),
                                "usedTags": {},
                            },
                        },
                    ]
                ),
                "result_data": "",
                "milestonedata_written": False,
            },
            client=MagicMock(),
        )
    assert prepared["target_group_count"] == 4
    assert prepared["top_five_group_count"] == 1


@pytest.mark.asyncio
async def test_build_clusters_and_persist() -> None:
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
        "target_group_count": 4,
        "top_five_group_count": 2,
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
        built = await build_clusters(state)  # type: ignore[arg-type]
    assert len(built["generated_output"]["groups"]) == 6
    assert built["generated_output"]["groups"][0]["profileId"] == MENU_CLUSTERER_PROFILE_TOP_FIVE
    assert built["generated_output"]["groups"][2]["profileId"] == "hook_reel"
    assert built["generated_output"]["topFiveGroupCount"] == 2
    assert built["generated_output"]["targetGroupCount"] == 4

    with patch(
        "agents_app.agents.core.milestone_run.menu_clusterer.nodes.upsert_milestonedata_node",
        new=AsyncMock(),
    ) as upsert:
        saved = await persist_result({**state, **built}, client=MagicMock())  # type: ignore[arg-type]
        upsert.assert_awaited_once()
    assert saved["milestonedata_written"] is True
