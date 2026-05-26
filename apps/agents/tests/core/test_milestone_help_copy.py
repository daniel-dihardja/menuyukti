"""Unit tests for milestone help copy (no GraphQL)."""

from agents_app.agents.core.chat.milestone_help_copy import (
    format_milestone_help_markdown,
    format_optional_input_section,
    resolve_what_it_does,
)


def test_resolve_what_it_does_preset_catalog() -> None:
    text = resolve_what_it_does("culture_hooks", "custom should not win")
    assert "Campaign Brief data" in text
    assert "custom should not win" not in text


def test_scheduler_help_mentions_reels_and_campaign_brief() -> None:
    text = resolve_what_it_does("scheduler", None)
    assert "Campaign Brief" in text
    assert "twice-weekly lunch cadence" in text


def test_resolve_what_it_does_custom_when_no_catalog() -> None:
    assert resolve_what_it_does("dates", "  My custom goal  ") == "My custom goal"


def test_resolve_what_it_does_fallback() -> None:
    assert (
        resolve_what_it_does("dates", None) == "Add goal text to describe what this milestone does."
    )
    assert (
        resolve_what_it_does(None, "   ") == "Add goal text to describe what this milestone does."
    )


def test_format_optional_input_campaign_brief() -> None:
    section = format_optional_input_section("restaurant_campaign_brief")
    assert section is not None
    assert "Campaign brief notes" in section
    assert "soccer World Cup" in section


def test_format_optional_input_promotion_or_culture_generic() -> None:
    for pid in ("promotion_candidates", "culture_hooks", "menu_tagger"):
        section = format_optional_input_section(pid)
        assert section is not None
        assert "## Optional input" in section
        assert "free-form guidance" in section


def test_format_optional_input_dates_none() -> None:
    assert format_optional_input_section("dates") is None


def test_format_milestone_help_markdown_full() -> None:
    out = format_milestone_help_markdown(
        name="Test milestone",
        preset_id="promotion_candidates",
        milestone_goal=None,
    )
    assert "## Test milestone" in out
    assert "## What this milestone does" in out
    assert "promotion-engineering candidates" in out
    assert "## Optional input" in out
