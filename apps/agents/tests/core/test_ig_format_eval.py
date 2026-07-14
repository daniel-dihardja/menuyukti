"""Tests for deterministic IG Format milestone eval checks."""

from __future__ import annotations

from agents_app.agents.core.milestone_eval.ig_format_eval import (
    enrich_ig_format_eval_payload,
    is_ig_format_milestone_data,
    try_ig_format_deterministic_verdict,
)

_PRIOR_MENU_PICKER_REQ = (
    "A prior **ig_menu_picker** milestone with saved **entries** that include "
    "**menuItems** exists earlier in the workflow."
)
_VALID_TYPE_REQ = (
    "Each output entry has a valid **type** (`reel`, `post`, `post-carousel`, or `story`) "
    "and non-empty **formatRationale**."
)
_SLOT_COVERAGE_REQ = (
    "Output **entries** slot coverage matches the prior menu picker "
    "(same slotKeys, no extras or omissions)."
)
_CAROUSEL_REQ = "**post-carousel** is used only when an entry has **2+ menuItems**."


def _menu_item(menu: str = "Margherita") -> dict[str, str]:
    return {"menu": menu, "rationale": "Strong lunch performer."}


def _entry(
    slot_key: str,
    *,
    fmt_type: str = "post",
    menu_items: list[dict[str, str]] | None = None,
    rationale: str = "Static showcase fits weekday lunch.",
) -> dict:
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
        "type": fmt_type,
        "formatRationale": rationale,
    }


def _payload(*entries: dict, **hints: object) -> dict:
    return {
        "scheduleExplanation": "Focus hero content on weak lunch slots.",
        "entries": list(entries),
        "sourceAnalyticsRunId": "42",
        "reportingPeriod": "2025-01-01 to 2025-03-31",
        "sourceIgMenuPickerTitle": "IG Menu Picker",
        "_evalHints": {
            "hasPriorIgMenuPicker": True,
            "priorIgMenuPickerEntryCount": 2,
            "sourceMenuPickerSlotKeys": ["monday-lunch", "wednesday-lunch"],
            "expectedOutputSlotKeys": ["monday-lunch", "wednesday-lunch"],
            "outputSlotKeys": [str(entry["slotKey"]) for entry in entries],
            **hints,
        },
    }


def test_is_ig_format_milestone_data_requires_type_and_menu_items() -> None:
    assert is_ig_format_milestone_data(_payload(_entry("monday-lunch")))
    assert not is_ig_format_milestone_data(
        {
            "entries": [
                {
                    "slotKey": "monday-lunch",
                    "menuItems": [_menu_item()],
                }
            ]
        }
    )


def test_prior_menu_picker_passes_with_hints() -> None:
    verdict = try_ig_format_deterministic_verdict(_PRIOR_MENU_PICKER_REQ, _payload(_entry("monday-lunch")))
    assert verdict is not None
    assert verdict[0] == "pass"


def test_valid_type_fails_for_invalid_enum() -> None:
    verdict = try_ig_format_deterministic_verdict(
        _VALID_TYPE_REQ,
        _payload(_entry("monday-lunch", fmt_type="live")),
    )
    assert verdict is not None
    assert verdict[0] == "fail"


def test_slot_coverage_fails_when_output_missing_slot() -> None:
    verdict = try_ig_format_deterministic_verdict(
        _SLOT_COVERAGE_REQ,
        _payload(
            _entry("monday-lunch"),
            expectedOutputSlotKeys=["monday-lunch", "wednesday-lunch"],
            outputSlotKeys=["monday-lunch"],
        ),
    )
    assert verdict is not None
    assert verdict[0] == "fail"


def test_slot_coverage_passes_when_keys_match() -> None:
    verdict = try_ig_format_deterministic_verdict(
        _SLOT_COVERAGE_REQ,
        _payload(_entry("monday-lunch"), _entry("wednesday-lunch")),
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_carousel_fails_with_single_menu_item() -> None:
    verdict = try_ig_format_deterministic_verdict(
        _CAROUSEL_REQ,
        _payload(_entry("monday-lunch", fmt_type="post-carousel", menu_items=[_menu_item()])),
    )
    assert verdict is not None
    assert verdict[0] == "fail"


def test_carousel_passes_with_two_menu_items() -> None:
    verdict = try_ig_format_deterministic_verdict(
        _CAROUSEL_REQ,
        _payload(
            _entry(
                "monday-lunch",
                fmt_type="post-carousel",
                menu_items=[_menu_item("A"), _menu_item("B")],
            )
        ),
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_enrich_ig_format_eval_payload_adds_output_slot_keys() -> None:
    enriched = enrich_ig_format_eval_payload(_payload(_entry("monday-lunch")))
    assert enriched["_evalHints"]["outputSlotKeys"] == ["monday-lunch"]
