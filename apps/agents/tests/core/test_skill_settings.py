"""Unit tests for milestone run skill settings parsing."""

from __future__ import annotations

from agents_app.agents.core.milestone_run.skill_settings import (
    normalize_skill_id_list,
    resolve_skill_selection_from_milestone_data,
)


def test_resolve_auto_when_mode_missing() -> None:
    use_llm, ids = resolve_skill_selection_from_milestone_data({}, {"a": 1, "b": 2})
    assert use_llm is True
    assert ids == []


def test_resolve_auto_when_mode_auto() -> None:
    use_llm, ids = resolve_skill_selection_from_milestone_data(
        {"milestoneRunSkillMode": "auto", "milestoneRunSkillIds": ["a"]},
        {"a": 1},
    )
    assert use_llm is True


def test_resolve_fixed_with_valid_ids() -> None:
    reg = {"public_holidays": 1, "generic": 2, "promotion_candidates": 3}
    use_llm, ids = resolve_skill_selection_from_milestone_data(
        {
            "milestoneRunSkillMode": "fixed",
            "milestoneRunSkillIds": ["public_holidays", "promotion-candidates"],
        },
        reg,
    )
    assert use_llm is False
    assert ids == ["public_holidays", "promotion_candidates"]


def test_resolve_fixed_empty_ids_falls_back_to_llm() -> None:
    use_llm, ids = resolve_skill_selection_from_milestone_data(
        {"milestoneRunSkillMode": "fixed", "milestoneRunSkillIds": []},
        {"generic": 1},
    )
    assert use_llm is True
    assert ids == []


def test_normalize_hyphen_and_cap() -> None:
    reg = {"public_holidays": 1}
    assert normalize_skill_id_list(["Public-Holidays"], reg) == ["public_holidays"]


def test_normalize_max_two() -> None:
    reg = {"a": 1, "b": 2, "c": 3}
    assert normalize_skill_id_list(["a", "b", "c"], reg) == ["a", "b"]
