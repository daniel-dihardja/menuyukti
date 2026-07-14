"""Tests for deterministic IG Menu Picker milestone eval checks."""

from __future__ import annotations

from agents_app.agents.core.milestone_eval.ig_menu_picker_eval import (
    enrich_ig_menu_picker_eval_payload,
    try_ig_menu_picker_deterministic_verdict,
)

_PRIOR_IG_PLAN_REQ = (
    "A prior **ig_plan** milestone with saved **entries** exists earlier in the workflow."
)
_MENU_ITEMS_REQ = (
    "Each selected entry in the output has **1–3 menuItems** with non-empty **menu** names."
)
_SELECTED_ENTRIES_REQ = (
    "Output **entries** include only slots selected on the Input tab "
    "(empty selection = all IG Plan entries)."
)


def _menu_item(menu: str = "Margherita") -> dict[str, str]:
    return {"menu": menu, "rationale": "Strong lunch performer."}


def _entry(slot_key: str, *, menu_items: list[dict[str, str]] | None = None) -> dict:
    return {
        "day": "wednesday",
        "slot": "12:00",
        "objective": "Drive lunch traffic",
        "pillar": "hero",
        "mealPeriod": "lunch",
        "productRole": "star",
        "slotStrategy": "grow",
        "slotKey": slot_key,
        "menuItems": menu_items if menu_items is not None else [_menu_item()],
    }


def _payload(*entries: dict, **hints: object) -> dict:
    return {
        "scheduleExplanation": "Focus hero content on weak lunch slots.",
        "entries": list(entries),
        "sourceAnalyticsRunId": "42",
        "reportingPeriod": "2025-01-01 to 2025-03-31",
        "sourceIgPlanTitle": "IG Plan",
        "_evalHints": {
            "hasPriorIgPlan": True,
            "priorIgPlanEntryCount": 2,
            "emptySelectionMeansAll": True,
            "selectedSlotKeys": [],
            "igPlanSlotKeys": ["monday-lunch", "wednesday-lunch"],
            "expectedOutputSlotKeys": ["monday-lunch", "wednesday-lunch"],
            "outputSlotKeys": [str(entry["slotKey"]) for entry in entries],
            **hints,
        },
    }


def test_selected_entries_passes_when_output_matches_all_plan_slots() -> None:
    verdict = try_ig_menu_picker_deterministic_verdict(
        _SELECTED_ENTRIES_REQ,
        _payload(
            _entry("monday-lunch"),
            _entry("wednesday-lunch"),
        ),
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_selected_entries_passes_for_explicit_subset() -> None:
    verdict = try_ig_menu_picker_deterministic_verdict(
        _SELECTED_ENTRIES_REQ,
        _payload(
            _entry("wednesday-lunch"),
            emptySelectionMeansAll=False,
            selectedSlotKeys=["wednesday-lunch"],
            expectedOutputSlotKeys=["wednesday-lunch"],
            igPlanSlotKeys=["monday-lunch", "wednesday-lunch"],
        ),
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_selected_entries_fails_when_output_includes_unselected_slot() -> None:
    verdict = try_ig_menu_picker_deterministic_verdict(
        _SELECTED_ENTRIES_REQ,
        _payload(
            _entry("monday-lunch"),
            _entry("wednesday-lunch"),
            emptySelectionMeansAll=False,
            selectedSlotKeys=["wednesday-lunch"],
            expectedOutputSlotKeys=["wednesday-lunch"],
            igPlanSlotKeys=["monday-lunch", "wednesday-lunch"],
        ),
    )
    assert verdict is not None
    assert verdict[0] == "fail"
    assert "unexpected slotKeys" in verdict[1]


def test_menu_items_passes_for_valid_entries() -> None:
    verdict = try_ig_menu_picker_deterministic_verdict(
        _MENU_ITEMS_REQ,
        _payload(_entry("wednesday-lunch")),
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_menu_items_fails_when_menu_name_is_empty() -> None:
    verdict = try_ig_menu_picker_deterministic_verdict(
        _MENU_ITEMS_REQ,
        _payload(_entry("wednesday-lunch", menu_items=[{"menu": "", "rationale": "x"}])),
    )
    assert verdict is not None
    assert verdict[0] == "fail"


def test_prior_ig_plan_passes_with_source_title() -> None:
    verdict = try_ig_menu_picker_deterministic_verdict(
        _PRIOR_IG_PLAN_REQ,
        _payload(_entry("wednesday-lunch")),
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_enrich_payload_adds_output_slot_keys() -> None:
    enriched = enrich_ig_menu_picker_eval_payload(_payload(_entry("wednesday-lunch")))
    hints = enriched["_evalHints"]
    assert hints["outputSlotKeys"] == ["wednesday-lunch"]
