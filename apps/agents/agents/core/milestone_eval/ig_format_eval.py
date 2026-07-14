"""Deterministic pass/fail checks for IG Format milestone criteria."""

from __future__ import annotations

import re
from typing import Any, Literal

DeterministicVerdict = tuple[Literal["pass", "fail"], str]

VALID_FORMAT_TYPES = frozenset({"reel", "post", "post-carousel", "story"})


def _normalize_requirement(requirement: str) -> str:
    return re.sub(r"\*+", "", requirement).strip().lower()


def is_ig_format_milestone_data(data: dict[str, Any]) -> bool:
    from agents_app.agents.core.milestone_eval.ig_text_eval import is_ig_text_milestone_data

    if is_ig_text_milestone_data(data):
        return False
    entries = data.get("entries")
    if not isinstance(entries, list):
        return False
    return any(
        isinstance(row, dict) and "menuItems" in row and "type" in row for row in entries
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


def _is_prior_ig_menu_picker_requirement(norm: str) -> bool:
    if "prior" not in norm:
        return False
    if not ("menu picker" in norm or "ig_menu_picker" in norm.replace(" ", "_")):
        return False
    return (
        "exists earlier" in norm
        or "earlier in the workflow" in norm
        or "with saved" in norm
    )


def _is_valid_type_requirement(norm: str) -> bool:
    if "type" not in norm and "format" not in norm:
        return False
    return "valid" in norm or "every entry" in norm or "each entry" in norm


def _is_slot_coverage_requirement(norm: str) -> bool:
    if "slot" in norm and ("match" in norm or "coverage" in norm or "exactly" in norm):
        return True
    return "menu picker" in norm and "entries" in norm


def _is_carousel_requirement(norm: str) -> bool:
    return "carousel" in norm and ("2" in norm or "menu item" in norm or "menuitems" in norm)


def enrich_ig_format_eval_payload(data: dict[str, Any]) -> dict[str, Any]:
    if not is_ig_format_milestone_data(data):
        return data
    entries = _entries(data)
    hints = dict(_eval_hints(data))
    hints.setdefault("entryCount", len(entries))
    hints.setdefault("outputSlotKeys", _slot_keys(entries))
    enriched = dict(data)
    enriched["_evalHints"] = hints
    return enriched


def try_ig_format_deterministic_verdict(
    requirement: str,
    data: dict[str, Any],
) -> DeterministicVerdict | None:
    if not is_ig_format_milestone_data(data):
        return None

    norm = _normalize_requirement(requirement)
    entries = _entries(data)
    hints = _eval_hints(data)

    if _is_prior_ig_menu_picker_requirement(norm):
        has_prior = bool(hints.get("hasPriorIgMenuPicker"))
        prior_count = hints.get("priorIgMenuPickerEntryCount")
        if isinstance(prior_count, int) and prior_count > 0:
            has_prior = True
        if has_prior or str(data.get("sourceIgMenuPickerTitle") or "").strip():
            count = prior_count if isinstance(prior_count, int) else len(entries)
            return (
                "pass",
                f"Output references a prior ig_menu_picker milestone with {count} source entr"
                f"{'y' if count == 1 else 'ies'}.",
            )
        if entries:
            return (
                "pass",
                "Output entries were derived from a prior ig_menu_picker milestone.",
            )
        return (
            "fail",
            "No prior ig_menu_picker milestone data is referenced in the saved output.",
        )

    if _is_valid_type_requirement(norm):
        if not entries:
            return ("fail", "entries must include at least one slot with a format type.")
        issues: list[str] = []
        for index, entry in enumerate(entries, start=1):
            fmt_type = str(entry.get("type") or "").strip()
            if fmt_type not in VALID_FORMAT_TYPES:
                issues.append(f"entry {index} has invalid type: {fmt_type!r}")
            rationale = str(entry.get("formatRationale") or "").strip()
            if not rationale:
                issues.append(f"entry {index} is missing formatRationale")
        if issues:
            return ("fail", "; ".join(issues[:6]) + ("…" if len(issues) > 6 else ""))
        return (
            "pass",
            f"Each of the {len(entries)} output entr"
            f"{'y' if len(entries) == 1 else 'ies'} has a valid type and formatRationale.",
        )

    if _is_slot_coverage_requirement(norm):
        output_keys = _slot_keys(entries)
        expected_raw = hints.get("expectedOutputSlotKeys")
        expected: list[str] = []
        if isinstance(expected_raw, list):
            expected = [str(key).strip() for key in expected_raw if str(key).strip()]
        if not expected:
            source_raw = hints.get("sourceMenuPickerSlotKeys")
            if isinstance(source_raw, list):
                expected = [str(key).strip() for key in source_raw if str(key).strip()]

        if not expected and not output_keys:
            return ("fail", "No output entries and no expected slot coverage hints.")
        if not expected:
            return ("fail", "Cannot verify slot coverage without expectedOutputSlotKeys hints.")

        output_set = set(output_keys)
        expected_set = set(expected)
        extra = sorted(output_set - expected_set)
        missing = sorted(expected_set - output_set)
        coverage_issues: list[str] = []
        if extra:
            coverage_issues.append("unexpected slotKeys: " + ", ".join(extra[:5]))
        if missing:
            coverage_issues.append("missing slotKeys: " + ", ".join(missing[:5]))
        if coverage_issues:
            return ("fail", "; ".join(coverage_issues))
        return (
            "pass",
            f"Output includes exactly the {len(expected)} slot(s) from the prior menu picker.",
        )

    if _is_carousel_requirement(norm):
        carousel_issues: list[str] = []
        for index, entry in enumerate(entries, start=1):
            fmt_type = str(entry.get("type") or "").strip()
            if fmt_type != "post-carousel":
                continue
            menu_items = entry.get("menuItems")
            count = len(menu_items) if isinstance(menu_items, list) else 0
            if count < 2:
                carousel_issues.append(
                    f"entry {index} uses post-carousel but has {count} menuItem(s); need 2–3"
                )
        if carousel_issues:
            return ("fail", "; ".join(carousel_issues[:6]) + ("…" if len(carousel_issues) > 6 else ""))
        return (
            "pass",
            "Every post-carousel entry has at least two menuItems.",
        )

    return None
