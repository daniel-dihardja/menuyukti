"""Unit tests for chat milestone field projection formatting."""

from agents_app.agents.core.chat.tools import _format_milestone_fields


def test_format_milestone_fields_full_node() -> None:
    node = {
        "name": "Draft posts",
        "nodeType": "milestone",
        "locationId": 7,
        "milestoneGoal": "Increase weekend covers",
        "milestoneInput": {"audience": "locals"},
        "passCriterias": [
            {"id": "c1", "requirement": "Has 3 variants", "status": "open"},
        ],
        "milestoneResult": {"summary": "2/3 pass", "passed": 2, "total": 3, "criteria": []},
        "milestonePresetData": {"slots": [{"day": "Mon"}]},
        "data": {"order": 1, "goal": "legacy-should-not-appear-in-other"},
    }
    out = _format_milestone_fields(
        "m-99",
        node,
        ["meta", "goal", "input", "criteria", "eval", "data"],
        explicit_milestone_id=False,
    )
    assert "m-99" in out
    assert "Increase weekend covers" in out
    assert "**Audience:**" in out
    assert "locals" in out
    assert "c1" in out and "Has 3 variants" in out
    assert "2/3 pass" in out
    assert "**Slots:**" in out
    assert "Mon" in out
    assert "## Other milestone.data" in out
    assert '"order": 1' in out
    assert "legacy-should-not-appear" not in out


def test_format_milestone_fields_empty_typed_fields() -> None:
    node = {
        "name": "Empty",
        "nodeType": "milestone",
        "locationId": 1,
        "data": {},
    }
    out = _format_milestone_fields(
        "42",
        node,
        ["meta", "goal", "input", "data"],
        explicit_milestone_id=False,
    )
    assert "(not set)" in out
    assert "## Other milestone.data" in out
    assert "(none)" in out


def test_format_milestone_fields_input_only() -> None:
    node = {"milestoneInput": {"audience": "locals"}}
    out = _format_milestone_fields(
        "42",
        node,
        ["input"],
        explicit_milestone_id=False,
    )
    assert "## Input (milestoneInput)" in out
    assert "## Goal" not in out
