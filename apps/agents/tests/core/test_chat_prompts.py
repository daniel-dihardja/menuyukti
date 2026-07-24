"""Tests for workflow chat system prompt template assembly."""

from agents_app.agents.core.chat.prompts import (
    CHART_CATALOG_BLOCK,
    IG_STUDIO_BLOCK,
    SYSTEM_PROMPT_TEMPLATE,
    build_system_prompt,
)


def test_system_prompt_template_has_complete_structure() -> None:
    assert "Instagram content advisor" in SYSTEM_PROMPT_TEMPLATE
    assert "plan Instagram content and schedule" in SYSTEM_PROMPT_TEMPLATE
    assert "venue_slot_strength_heatmap" in SYSTEM_PROMPT_TEMPLATE
    assert "posting frequency" in SYSTEM_PROMPT_TEMPLATE
    assert "menu_item_heatmap" in SYSTEM_PROMPT_TEMPLATE
    assert "which menus to feature" in SYSTEM_PROMPT_TEMPLATE
    assert "pair_lift_matrix_heatmap" in SYSTEM_PROMPT_TEMPLATE
    assert "menu combos" in SYSTEM_PROMPT_TEMPLATE
    assert "do not dump full chart payloads" in SYSTEM_PROMPT_TEMPLATE
    assert "{chart_catalog_block}" in SYSTEM_PROMPT_TEMPLATE
    assert "{ig_studio_block}" in SYSTEM_PROMPT_TEMPLATE
    assert "{workflow_catalog_block}" not in SYSTEM_PROMPT_TEMPLATE
    assert "get_location_data" in SYSTEM_PROMPT_TEMPLATE
    assert "create_instagram_items" not in SYSTEM_PROMPT_TEMPLATE
    assert "get_milestone" not in SYSTEM_PROMPT_TEMPLATE
    assert "list_instagram_items" not in SYSTEM_PROMPT_TEMPLATE


def test_build_system_prompt_without_optional_blocks() -> None:
    out = build_system_prompt()
    assert "Instagram content advisor" in out
    assert "posting frequency" in out
    assert "## Workflow chart catalog" not in out
    assert "## Workflow milestone catalog" not in out
    assert "IG Studio Post Creator" not in out
    assert "get_chart_data" in out
    assert "get_location_data" in out
    assert "{chart_catalog_block}" not in out
    assert "{ig_studio_block}" not in out


def test_build_system_prompt_with_chart_catalog() -> None:
    out = build_system_prompt(include_chart_catalog=True)
    assert CHART_CATALOG_BLOCK.strip() in out
    assert "## Workflow chart catalog" in out
    assert "venue_slot_strength_heatmap" in out
    assert "posting frequency and best timing" in out
    assert "interesting menu combos" in out
    assert "get_chart_data" in out


def test_build_system_prompt_with_ig_studio() -> None:
    out = build_system_prompt(ig_studio_post_image=True)
    assert IG_STUDIO_BLOCK.strip() in out
    assert "generate_instagram_post_image" in out
