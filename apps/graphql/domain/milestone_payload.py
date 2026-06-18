"""Validation for milestone column payloads."""

from __future__ import annotations

from typing import Any

_PASS_CRITERIA_STATUSES = frozenset({"pass", "fail", "open"})


def validate_pass_criteria_list(rows: object) -> None:
    if not isinstance(rows, list):
        raise ValueError("passCriterias must be a JSON array")
    for item in rows:
        if not isinstance(item, dict):
            raise ValueError("each pass criterion must be an object")
        cid = item.get("id")
        requirement = item.get("requirement")
        status = item.get("status")
        if not isinstance(cid, str) or not cid.strip():
            raise ValueError("each pass criterion must have a non-empty string id")
        if not isinstance(requirement, str):
            raise ValueError("each pass criterion must have a string requirement")
        if status not in _PASS_CRITERIA_STATUSES:
            raise ValueError("pass criterion status must be pass, fail, or open")


def validate_result_payload(data: dict[str, Any]) -> None:
    summary = data.get("summary")
    if not isinstance(summary, str):
        raise ValueError("milestoneResult must include a string field summary")
    passed = data.get("passed")
    total = data.get("total")
    if not isinstance(passed, int):
        raise ValueError("milestoneResult must include an integer field passed")
    if not isinstance(total, int):
        raise ValueError("milestoneResult must include an integer field total")
    criteria = data.get("criteria")
    if criteria is not None and not isinstance(criteria, list):
        raise ValueError("milestoneResult criteria must be a list when present")
