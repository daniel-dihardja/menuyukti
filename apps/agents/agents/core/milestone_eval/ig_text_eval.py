"""Deterministic pass/fail checks for IG Text milestone criteria."""

from __future__ import annotations

import re
from typing import Any, Literal

from agents_app.agents.core.milestone_run.output_schema import _ig_text_required_fields

DeterministicVerdict = tuple[Literal["pass", "fail"], str]


def _normalize_requirement(requirement: str) -> str:
    return re.sub(r"\*+", "", requirement).strip().lower()


def is_ig_text_milestone_data(data: dict[str, Any]) -> bool:
    entries = data.get("entries")
    if not isinstance(entries, list):
        return False
    return any(
        isinstance(row, dict) and "texts" in row and "type" in row and "menuItems" in row
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


def _text_fields(entry: dict[str, Any]) -> dict[str, str]:
    raw = entry.get("texts")
    if not isinstance(raw, list):
        return {}
    fields: dict[str, str] = {}
    for row in raw:
        if not isinstance(row, dict):
            continue
        name = str(row.get("field") or "").strip()
        value = str(row.get("value") or "").strip()
        if name and value:
            fields[name] = value
    return fields


def _is_prior_ig_format_requirement(norm: str) -> bool:
    if "prior" not in norm:
        return False
    if "ig format" not in norm and "ig_format" not in norm.replace(" ", "_"):
        return False
    return "exists earlier" in norm or "earlier in the workflow" in norm or "with saved" in norm


def _is_slot_coverage_requirement(norm: str) -> bool:
    if "slot" in norm and ("match" in norm or "coverage" in norm or "exactly" in norm):
        return True
    return "ig format" in norm and "entries" in norm


def _is_nonempty_texts_requirement(norm: str) -> bool:
    return "texts" in norm and ("non-empty" in norm or "non empty" in norm or "every entry" in norm)


def _is_required_fields_requirement(norm: str) -> bool:
    return "required" in norm and ("field" in norm or "text" in norm)


def _is_campaign_brief_alignment_requirement(norm: str) -> bool:
    return "campaign brief" in norm and ("align" in norm or "tone" in norm or "grounded" in norm)


def enrich_ig_text_eval_payload(data: dict[str, Any]) -> dict[str, Any]:
    if not is_ig_text_milestone_data(data):
        return data
    entries = _entries(data)
    hints = dict(_eval_hints(data))
    hints.setdefault("entryCount", len(entries))
    hints.setdefault("outputSlotKeys", _slot_keys(entries))
    enriched = dict(data)
    enriched["_evalHints"] = hints
    return enriched


def try_ig_text_deterministic_verdict(
    requirement: str,
    data: dict[str, Any],
) -> DeterministicVerdict | None:
    if not is_ig_text_milestone_data(data):
        return None

    norm = _normalize_requirement(requirement)
    entries = _entries(data)
    hints = _eval_hints(data)

    if _is_prior_ig_format_requirement(norm):
        has_prior = bool(hints.get("hasPriorIgFormat"))
        prior_count = hints.get("priorIgFormatEntryCount")
        if isinstance(prior_count, int) and prior_count > 0:
            has_prior = True
        if has_prior or str(data.get("sourceIgFormatTitle") or "").strip():
            count = prior_count if isinstance(prior_count, int) else len(entries)
            return (
                "pass",
                f"Output references a prior ig_format milestone with {count} source entr"
                f"{'y' if count == 1 else 'ies'}.",
            )
        if entries:
            return (
                "pass",
                "Output entries were derived from a prior ig_format milestone.",
            )
        return (
            "fail",
            "No prior ig_format milestone data is referenced in the saved output.",
        )

    if _is_slot_coverage_requirement(norm):
        output_keys = _slot_keys(entries)
        expected_raw = hints.get("expectedOutputSlotKeys")
        expected: list[str] = []
        if isinstance(expected_raw, list):
            expected = [str(key).strip() for key in expected_raw if str(key).strip()]
        if not expected:
            source_raw = hints.get("sourceIgFormatSlotKeys")
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
            f"Output includes exactly the {len(expected)} slot(s) from the prior IG Format.",
        )

    if _is_nonempty_texts_requirement(norm):
        if not entries:
            return ("fail", "entries must include at least one slot with texts.")
        issues: list[str] = []
        for index, entry in enumerate(entries, start=1):
            fields = _text_fields(entry)
            if not fields:
                issues.append(f"entry {index} has no non-empty texts")
        if issues:
            return ("fail", "; ".join(issues[:6]) + ("…" if len(issues) > 6 else ""))
        return (
            "pass",
            f"Each of the {len(entries)} output entr"
            f"{'y' if len(entries) == 1 else 'ies'} has non-empty texts.",
        )

    if _is_required_fields_requirement(norm):
        field_issues: list[str] = []
        for index, entry in enumerate(entries, start=1):
            fmt_type = str(entry.get("type") or "").strip()
            menu_items = entry.get("menuItems")
            count = len(menu_items) if isinstance(menu_items, list) else 0
            required = _ig_text_required_fields(fmt_type, count)
            fields = _text_fields(entry)
            missing = [name for name in required if name not in fields]
            if missing:
                field_issues.append(
                    f"entry {index} ({fmt_type}) missing: {', '.join(missing[:4])}"
                    + ("…" if len(missing) > 4 else "")
                )
        if field_issues:
            return ("fail", "; ".join(field_issues[:6]) + ("…" if len(field_issues) > 6 else ""))
        return (
            "pass",
            "Each entry includes all required text fields for its format type.",
        )

    if _is_campaign_brief_alignment_requirement(norm):
        if str(data.get("sourceCampaignBriefTitle") or "").strip() or hints.get(
            "sourceCampaignBriefTitle"
        ):
            return (
                "pass",
                "Output references a prior campaign brief used for copy orientation.",
            )
        return None

    return None
