"""Tests for workflow chat system prompt template assembly."""

from agents_app.agents.core.chat.prompts import (
    CHART_CATALOG_BLOCK,
    IG_STUDIO_BLOCK,
    LEONARDO_IMAGE_BLOCK,
    SYSTEM_PROMPT_TEMPLATE,
    build_system_prompt,
)


def test_system_prompt_template_has_complete_structure() -> None:
    assert "Instagram content assistant" in SYSTEM_PROMPT_TEMPLATE
    assert "acting through Instagram item tools" in SYSTEM_PROMPT_TEMPLATE
    assert "venue_slot_strength_heatmap" in SYSTEM_PROMPT_TEMPLATE
    assert "posting frequency" in SYSTEM_PROMPT_TEMPLATE
    assert "menu_item_heatmap" in SYSTEM_PROMPT_TEMPLATE
    assert "which menus to feature" in SYSTEM_PROMPT_TEMPLATE
    assert "pair_lift_matrix_heatmap" in SYSTEM_PROMPT_TEMPLATE
    assert "menu combos" in SYSTEM_PROMPT_TEMPLATE
    assert "do not dump full chart payloads" in SYSTEM_PROMPT_TEMPLATE
    assert "{chart_catalog_block}" in SYSTEM_PROMPT_TEMPLATE
    assert "{workflow_catalog_block}" in SYSTEM_PROMPT_TEMPLATE
    assert "{leonardo_image_block}" in SYSTEM_PROMPT_TEMPLATE
    assert "{ig_studio_block}" in SYSTEM_PROMPT_TEMPLATE
    assert "get_milestone" in SYSTEM_PROMPT_TEMPLATE
    assert "secondary" in SYSTEM_PROMPT_TEMPLATE.lower()
    assert "get_location_data" in SYSTEM_PROMPT_TEMPLATE
    assert "get_instagram_item" in SYSTEM_PROMPT_TEMPLATE
    assert "create_instagram_items" in SYSTEM_PROMPT_TEMPLATE
    assert "list_instagram_items" in SYSTEM_PROMPT_TEMPLATE
    assert "update_instagram_items" in SYSTEM_PROMPT_TEMPLATE
    assert "delete_instagram_items" in SYSTEM_PROMPT_TEMPLATE


def test_build_system_prompt_without_optional_blocks() -> None:
    out = build_system_prompt()
    assert "Instagram content assistant" in out
    assert "posting frequency" in out
    assert "## Workflow chart catalog" not in out
    assert "## Workflow milestone catalog" not in out
    assert "IG Studio Post Creator" not in out
    assert "Image generation (Leonardo)" not in out
    assert "source of truth" in out
    assert "get_workflow_overview" in out
    assert "only if the catalog is missing" in out
    assert "get_chart_data" in out
    assert "get_instagram_item" in out
    assert "Milestones are secondary" in out
    assert "{chart_catalog_block}" not in out
    assert "{workflow_catalog_block}" not in out
    assert "{leonardo_image_block}" not in out
    assert "{ig_studio_block}" not in out


def test_build_system_prompt_with_milestone_catalog() -> None:
    catalog = "# Workflow overview\n\n## 1. Campaign Brief\n- **id**: 42\n"
    out = build_system_prompt(workflow_catalog=catalog)
    assert "Instagram content assistant" in out
    assert "## Workflow milestone catalog" in out
    assert "# Workflow overview" in out
    assert "**id**: 42" in out
    assert "## Workflow chart catalog" not in out


def test_build_system_prompt_with_chart_catalog() -> None:
    out = build_system_prompt(include_chart_catalog=True)
    assert CHART_CATALOG_BLOCK.strip() in out
    assert "## Workflow chart catalog" in out
    assert "venue_slot_strength_heatmap" in out
    assert "posting frequency and best timing" in out
    assert "interesting menu combos" in out
    assert "get_chart_data" in out


def test_build_system_prompt_with_leonardo_image_generation() -> None:
    out = build_system_prompt(leonardo_image_generation=True)
    assert LEONARDO_IMAGE_BLOCK.strip() in out
    assert "generate_instagram_post_image" in out
    assert "Sales or analytics data is not required" in out
    assert "Leonardo reference images" in out
    assert "Do not paste the image URL" in out
    assert "IG Studio Post Creator" not in out


def test_build_system_prompt_with_ig_studio() -> None:
    out = build_system_prompt(ig_studio_post_image=True)
    assert IG_STUDIO_BLOCK.strip() in out
    assert "generate_instagram_post_image" in out
    assert "Do not paste the image URL" in out


def test_build_system_prompt_ignores_blank_catalog() -> None:
    base = build_system_prompt()
    assert build_system_prompt(workflow_catalog="   ") == base
    assert build_system_prompt(workflow_catalog="") == base
