"""Unit tests for chat milestone row snapshot formatting."""

from agents_app.agents.core.chat.tools import _format_milestone_snapshot


def test_format_milestone_snapshot_full_node() -> None:
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
    out = _format_milestone_snapshot("m-99", node)
    assert "m-99" in out
    assert "Increase weekend covers" in out
    assert '"audience": "locals"' in out
    assert "c1" in out and "Has 3 variants" in out
    assert "2/3 pass" in out
    assert '"slots"' in out
    assert "## Other milestone.data" in out
    assert '"order": 1' in out
    assert "legacy-should-not-appear" not in out


def test_format_milestone_snapshot_empty_typed_fields() -> None:
    node = {
        "name": "Empty",
        "nodeType": "milestone",
        "locationId": 1,
        "data": {},
    }
    out = _format_milestone_snapshot("42", node)
    assert "(not set)" in out
    assert "## Other milestone.data" in out
    assert "(none)" in out
