"""Shared validation helpers for playbook mutations."""

from __future__ import annotations

import re

_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
KNOWN_PLAYBOOK_TYPES = frozenset({"public_holidays"})


def validate_playbook_fields(
    *,
    name: str,
    playbook_type: str,
    start_date: str,
    end_date: str,
) -> tuple[str, str, str, str]:
    name_clean = name.strip()
    if not name_clean:
        raise ValueError("Name cannot be empty")
    if len(name_clean) > 256:
        raise ValueError("Name is too long")

    type_clean = playbook_type.strip().lower()
    if type_clean not in KNOWN_PLAYBOOK_TYPES:
        raise ValueError(f"Unknown playbook type: {playbook_type!r}")

    start_clean = start_date.strip()
    if not _DATE_RE.match(start_clean):
        raise ValueError("startDate must be YYYY-MM-DD")

    end_clean = end_date.strip()
    if not _DATE_RE.match(end_clean):
        raise ValueError("endDate must be YYYY-MM-DD")

    if end_clean < start_clean:
        raise ValueError("endDate must be on or after startDate")

    return name_clean, type_clean, start_clean, end_clean
