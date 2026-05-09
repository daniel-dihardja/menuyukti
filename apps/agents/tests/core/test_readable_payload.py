"""Tests for marketer-friendly chat payload formatting."""

from agents_app.agents.core.chat.readable_payload import format_payload_for_chat


def test_notes_empty_string_renders_em_dash() -> None:
    out = format_payload_for_chat({"notes": ""})
    assert "**Notes:**" in out
    assert "- **Notes:** -" in out


def test_milestone_input_type_and_value() -> None:
    out = format_payload_for_chat(
        {
            "type": "restaurant_campaign_brief",
            "value": {"notes": "", "startDate": "2026-05-01"},
        },
    )
    assert "**Type:**" in out
    assert "Restaurant Campaign Brief" in out
    assert "**Notes:**" in out
    assert "- **Notes:** -" in out
    assert "**Start Date:**" in out
    assert "2026-05-01" in out
