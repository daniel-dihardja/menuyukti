"""Tests for deterministic IG Text milestone eval checks."""

from __future__ import annotations

from agents_app.agents.core.milestone_eval.ig_text_eval import (
    enrich_ig_text_eval_payload,
    is_ig_text_milestone_data,
    try_ig_text_deterministic_verdict,
)

_PRIOR_IG_FORMAT_REQ = (
    "A prior **ig_format** milestone with saved **entries** exists earlier in the workflow."
)
_SLOT_COVERAGE_REQ = (
    "Output **entries** slot coverage matches the prior IG Format "
    "(same slotKeys, no extras or omissions)."
)
_NONEMPTY_TEXTS_REQ = "Every output entry has non-empty **texts** with **field** and **value**."
_REQUIRED_FIELDS_REQ = "Each entry includes all **required text fields** for its format type."


def _menu_item(menu: str = "Margherita") -> dict[str, str]:
    return {"menu": menu, "rationale": "Strong lunch performer."}


def _post_texts(menu: str = "Margherita") -> list[dict[str, str]]:
    return [
        {"field": "headline", "value": "Fresh lunch"},
        {"field": "subline", "value": "Today only"},
        {"field": "productName", "value": menu},
        {"field": "caption", "value": "Order now."},
    ]


def _entry(
    slot_key: str,
    *,
    fmt_type: str = "post",
    menu_items: list[dict[str, str]] | None = None,
    texts: list[dict[str, str]] | None = None,
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
        "formatRationale": "Static showcase fits weekday lunch.",
        "texts": texts if texts is not None else _post_texts(),
    }


def _payload(*entries: dict, **hints: object) -> dict:
    return {
        "scheduleExplanation": "Focus hero content on weak lunch slots.",
        "entries": list(entries),
        "sourceAnalyticsRunId": "42",
        "reportingPeriod": "2025-01-01 to 2025-03-31",
        "sourceIgFormatTitle": "IG Format",
        "_evalHints": {
            "hasPriorIgFormat": True,
            "priorIgFormatEntryCount": 2,
            "sourceIgFormatSlotKeys": ["monday-lunch", "wednesday-lunch"],
            "expectedOutputSlotKeys": ["monday-lunch", "wednesday-lunch"],
            "outputSlotKeys": [str(entry["slotKey"]) for entry in entries],
            **hints,
        },
    }


def test_is_ig_text_milestone_data_requires_texts_type_and_menu_items() -> None:
    assert is_ig_text_milestone_data(_payload(_entry("monday-lunch")))
    assert not is_ig_text_milestone_data(
        {
            "entries": [
                {
                    "slotKey": "monday-lunch",
                    "menuItems": [_menu_item()],
                    "type": "post",
                }
            ]
        }
    )


def test_prior_ig_format_passes_with_hints() -> None:
    verdict = try_ig_text_deterministic_verdict(
        _PRIOR_IG_FORMAT_REQ, _payload(_entry("monday-lunch"))
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_slot_coverage_fails_when_output_missing_slot() -> None:
    verdict = try_ig_text_deterministic_verdict(
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
    verdict = try_ig_text_deterministic_verdict(
        _SLOT_COVERAGE_REQ,
        _payload(_entry("monday-lunch"), _entry("wednesday-lunch")),
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_nonempty_texts_fails_when_entry_has_no_texts() -> None:
    verdict = try_ig_text_deterministic_verdict(
        _NONEMPTY_TEXTS_REQ,
        _payload(_entry("monday-lunch", texts=[])),
    )
    assert verdict is not None
    assert verdict[0] == "fail"


def test_required_fields_fails_for_missing_caption() -> None:
    verdict = try_ig_text_deterministic_verdict(
        _REQUIRED_FIELDS_REQ,
        _payload(
            _entry(
                "monday-lunch",
                texts=[
                    {"field": "headline", "value": "Only headline"},
                    {"field": "subline", "value": "Sub"},
                    {"field": "productName", "value": "Margherita"},
                ],
            )
        ),
    )
    assert verdict is not None
    assert verdict[0] == "fail"


def test_required_fields_passes_for_complete_post() -> None:
    verdict = try_ig_text_deterministic_verdict(
        _REQUIRED_FIELDS_REQ,
        _payload(_entry("monday-lunch")),
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_enrich_ig_text_eval_payload_adds_output_slot_keys() -> None:
    enriched = enrich_ig_text_eval_payload(_payload(_entry("monday-lunch")))
    assert enriched["_evalHints"]["outputSlotKeys"] == ["monday-lunch"]
