"""Tests for workflow chat system prompt template assembly."""

from agents_app.agents.core.chat.graph import chat_tools_list_from_config
from agents_app.agents.core.chat.prompts import (
    CHART_CATALOG_BLOCK,
    IG_STUDIO_BLOCK,
    LEONARDO_IMAGE_BLOCK,
    MEDIA_LIBRARY_BLOCK,
    STORY_IMAGE_ASSISTANT_PROMPT,
    SYSTEM_PROMPT_TEMPLATE,
    build_system_prompt,
)


def test_system_prompt_template_has_complete_structure() -> None:
    assert "Instagram content assistant" in SYSTEM_PROMPT_TEMPLATE
    assert "prefer grounded answers" in SYSTEM_PROMPT_TEMPLATE.replace("\n", " ")
    assert "venue_slot_strength_heatmap" in SYSTEM_PROMPT_TEMPLATE
    assert "posting frequency" in SYSTEM_PROMPT_TEMPLATE
    assert "menu_item_heatmap" in SYSTEM_PROMPT_TEMPLATE
    assert "which menus to feature" in SYSTEM_PROMPT_TEMPLATE
    assert "pair_lift_matrix_heatmap" in SYSTEM_PROMPT_TEMPLATE
    assert "menu combos" in SYSTEM_PROMPT_TEMPLATE
    assert "do not dump full chart payloads" in SYSTEM_PROMPT_TEMPLATE
    assert "{chart_catalog_block}" in SYSTEM_PROMPT_TEMPLATE
    assert "{workflow_catalog_block}" not in SYSTEM_PROMPT_TEMPLATE
    assert "{leonardo_image_block}" in SYSTEM_PROMPT_TEMPLATE
    assert "{ig_studio_block}" in SYSTEM_PROMPT_TEMPLATE
    assert "{media_library_block}" in SYSTEM_PROMPT_TEMPLATE
    assert "list_media_collections" in MEDIA_LIBRARY_BLOCK
    assert "list_media" in MEDIA_LIBRARY_BLOCK
    assert "get_milestone" not in SYSTEM_PROMPT_TEMPLATE
    assert "get_location_data" in SYSTEM_PROMPT_TEMPLATE


def test_build_system_prompt_without_optional_blocks() -> None:
    out = build_system_prompt()
    assert "Instagram content assistant" in out
    assert "posting frequency" in out
    assert "## Workflow chart catalog" not in out
    assert "## Workflow milestone catalog" not in out
    assert "IG Studio Post Creator" not in out
    assert "Image generation (Leonardo)" not in out
    assert "get_workflow_overview" not in out
    assert "get_chart_data" in out
    assert "get_milestone" not in out
    assert "{chart_catalog_block}" not in out
    assert "{leonardo_image_block}" not in out
    assert "{ig_studio_block}" not in out
    assert "list_media_collections" in out
    assert "## Media library" in out


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
    assert "prefer that context default" in out
    assert "do **not** pass the tool `model` arg" in out
    assert "IG Studio Post Creator" not in out


def test_build_system_prompt_with_ig_studio() -> None:
    out = build_system_prompt(ig_studio_post_image=True)
    assert IG_STUDIO_BLOCK.strip() in out
    assert "generate_instagram_post_image" in out
    assert "Do not paste the image URL" in out


def test_build_system_prompt_image_assistant_mode() -> None:
    out = build_system_prompt(chat_mode="image_assistant")
    assert out == STORY_IMAGE_ASSISTANT_PROMPT.rstrip() + "\n"
    assert "768×1376" in out
    assert "Instagram image assistant" in out
    assert "direction gathering" in out
    assert "describe the wished look" in out
    assert "reference image" in out
    assert "content" in out.lower()
    assert "on-image text" in out
    assert "skip" in out.lower() or "declines" in out
    assert "Phase 3" in out
    assert "confirm before generate" in out
    assert "Phase 4" in out
    assert "generate and refine" in out
    assert "Generate" in out and "Change" in out
    assert "single" in out.lower() or "one** step" in out or "one step" in out.lower()
    assert "List all collected data" in out or "list all collected data" in out.lower()
    assert "how the image will be generated" in out.lower()
    assert "request_story_generate_confirmation" in out
    assert "must" in out.lower()
    assert "Do **not** call `generate_instagram_post_image` in this phase" in out
    assert "Never** call `request_story_generate_confirmation` in Phase 4" in out or (
        "Never" in out and "request_story_generate_confirmation" in out and "Phase 4" in out
    )
    assert "yes/no" in out.lower()
    assert "without" in out.lower() and "tool" in out.lower()
    assert "generate_instagram_post_image" in out
    assert "prefer those context" in out
    assert "defaults" in out
    assert "model" in out and "arg" in out
    assert "save_story_asset" in out
    assert 'role="style"' in out
    assert 'role="content"' in out
    assert "Attached media library photos" in out
    assert "Never invent" in out or "never invent" in out.lower()
    assert "skip" in out.lower() and "content" in out.lower()
    assert "clear_story_assets" in out
    assert "media library" in out.lower()
    assert "Canva" in out
    assert "Operating loop for planning or content requests" not in out
    assert "get_chart_data" not in out


def test_build_system_prompt_image_assistant_legacy_alias() -> None:
    assert build_system_prompt(chat_mode="story_image_assistant") == build_system_prompt(
        chat_mode="image_assistant"
    )


def test_build_system_prompt_image_assistant_feed_format() -> None:
    out = build_system_prompt(chat_mode="image_assistant", image_format="feed")
    assert "928×1152" in out
    assert "4:5" in out
    assert "Feed" in out
    assert "768×1376" not in out


def test_build_system_prompt_general_chat_mode_unchanged() -> None:
    base = build_system_prompt()
    assert build_system_prompt(chat_mode=None) == base
    assert build_system_prompt(chat_mode="general") == base


def test_image_assistant_tools_include_generate() -> None:
    tools = chat_tools_list_from_config(
        {
            "chat_mode": "image_assistant",
            "agent_thread_id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
            "location_id": 1,
        }
    )
    names = {getattr(t, "name", None) or getattr(t, "__name__", None) for t in tools}
    assert names == {
        "list_media_collections",
        "list_media",
        "save_story_asset",
        "clear_story_assets",
        "request_story_generate_confirmation",
        "generate_instagram_post_image",
    }
    assert "list_instagram_items" not in names
    assert "create_instagram_items" not in names
    assert "get_milestone" not in names
    assert "get_chart_data" not in names
