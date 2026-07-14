"""Deterministic pass/fail checks for IG Menu Picker milestone criteria."""

from __future__ import annotations

import re
from typing import Any, Literal

DeterministicVerdict = tuple[Literal["pass", "fail"], str]


def _normalize_requirement(requirement: str) -> str:
    return re.sub(r"\*+", "", requirement).strip().lower()


def is_ig_menu_picker_milestone_data(data: dict[str, Any]) -> bool:
    entries = data.get("entries")
    if not isinstance(entries, list):
        return False
    return any(
        isinstance(row, dict)
        and "menuItems" in row
        and "type" not in row
        for row in entries
    )


def _entries(data: dict[str, Any]) -> list[dict[str, Any]]:
    raw = data.get("entries")
    if not isinstance(raw, list):
        return []
    return [row for row in raw if isinstance(row, dict)]


def _eval_hints(data: dict[str, Any]) -> dict[str, Any]:
    hints = data.get("_evalHints")
    return hints if isinstance(hints, dict) else {}


def _slot_keys(entries: list[dict[str, Any]]) -> list[str]:
    keys: list[str] = []
    for entry in entries:
        key = str(entry.get("slotKey") or "").strip()
        if key:
            keys.append(key)
    return keys


def _is_prior_ig_plan_requirement(norm: str) -> bool:
    return "prior" in norm and "ig_plan" in norm and "entries" in norm


def _is_menu_items_requirement(norm: str) -> bool:
    if "menuitems" not in norm and "menu items" not in norm:
        return False
    return "1-3" in norm or "1–3" in norm or "1 to 3" in norm


def _is_selected_entries_requirement(norm: str) -> bool:
    if "only slots selected" in norm:
        return True
    if "input tab" in norm and "entries" in norm:
        return True
    return "empty selection" in norm and "ig plan" in norm


def enrich_ig_menu_picker_eval_payload(data: dict[str, Any]) -> dict[str, Any]:
    if not is_ig_menu_picker_milestone_data(data):
        return data
    entries = _entries(data)
    hints = dict(_eval_hints(data))
    hints.setdefault("entryCount", len(entries))
    hints.setdefault("outputSlotKeys", _slot_keys(entries))
    enriched = dict(data)
    enriched["_evalHints"] = hints
    return enriched


def try_ig_menu_picker_deterministic_verdict(
    requirement: str,
    data: dict[str, Any],
) -> DeterministicVerdict | None:
    if not is_ig_menu_picker_milestone_data(data):
        return None

    norm = _normalize_requirement(requirement)
    entries = _entries(data)
    hints = _eval_hints(data)

    if _is_prior_ig_plan_requirement(norm):
        has_prior = bool(hints.get("hasPriorIgPlan"))
        prior_count = hints.get("priorIgPlanEntryCount")
        if isinstance(prior_count, int) and prior_count > 0:
            has_prior = True
        if has_prior or str(data.get("sourceIgPlanTitle") or "").strip():
            count = prior_count if isinstance(prior_count, int) else len(entries)
            return (
                "pass",
                f"Output references a prior ig_plan milestone with {count} source entr"
                f"{'y' if count == 1 else 'ies'}.",
            )
        if entries:
            return (
                "pass",
                "Output entries were derived from a prior ig_plan milestone.",
            )
        return (
            "fail",
            "No prior ig_plan milestone data is referenced in the saved output.",
        )

    if _is_menu_items_requirement(norm):
        if not entries:
            return ("fail", "entries must include at least one selected IG Plan slot.")
        issues: list[str] = []
        for index, entry in enumerate(entries, start=1):
            menu_items = entry.get("menuItems")
            if not isinstance(menu_items, list):
                issues.append(f"entry {index} is missing menuItems")
                continue
            if not 1 <= len(menu_items) <= 3:
                issues.append(f"entry {index} must have 1–3 menuItems (found {len(menu_items)})")
                continue
            for item_index, raw_item in enumerate(menu_items, start=1):
                if not isinstance(raw_item, dict):
                    issues.append(f"entry {index} menuItems[{item_index}] must be an object")
                    continue
                menu = str(raw_item.get("menu") or "").strip()
                if not menu:
                    issues.append(f"entry {index} menuItems[{item_index}] has empty menu name")
        if issues:
            return ("fail", "; ".join(issues[:6]) + ("…" if len(issues) > 6 else ""))
        return (
            "pass",
            f"Each of the {len(entries)} output entr"
            f"{'y' if len(entries) == 1 else 'ies'} has 1–3 menuItems with non-empty menu names.",
        )

    if _is_selected_entries_requirement(norm):
        output_keys = _slot_keys(entries)
        expected_raw = hints.get("expectedOutputSlotKeys")
        expected: list[str] = []
        if isinstance(expected_raw, list):
            expected = [str(key).strip() for key in expected_raw if str(key).strip()]

        if not expected:
            ig_plan_keys_raw = hints.get("igPlanSlotKeys")
            selected_raw = hints.get("selectedSlotKeys")
            ig_plan_keys: list[str] = []
            if isinstance(ig_plan_keys_raw, list):
                ig_plan_keys = [str(key).strip() for key in ig_plan_keys_raw if str(key).strip()]
            selected_keys: list[str] = []
            if isinstance(selected_raw, list):
                selected_keys = [str(key).strip() for key in selected_raw if str(key).strip()]
            empty_means_all = bool(hints.get("emptySelectionMeansAll"))
            expected = (
                ig_plan_keys if empty_means_all or not selected_keys else selected_keys
            )

        if not expected and not output_keys:
            return ("fail", "No output entries and no expected slot selection hints.")
        if not expected:
            return (
                "fail",
                "Cannot verify slot selection without expectedOutputSlotKeys eval hints.",
            )

        output_set = set(output_keys)
        expected_set = set(expected)
        extra = sorted(output_set - expected_set)
        missing = sorted(expected_set - output_set)
        slot_issues: list[str] = []
        if extra:
            slot_issues.append("unexpected slotKeys: " + ", ".join(extra[:5]))
        if missing:
            slot_issues.append("missing slotKeys: " + ", ".join(missing[:5]))
        if slot_issues:
            return ("fail", "; ".join(slot_issues))
        return (
            "pass",
            f"Output includes exactly the {len(expected)} selected slot(s) from the Input tab.",
        )

    return None
