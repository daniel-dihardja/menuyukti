"""Parse milestone node JSON for fixed vs LLM skill selection."""

from __future__ import annotations

import re
from typing import Any


def _normalize_skill_id(raw: str) -> str:
    s = raw.strip().lower().replace("-", "_")
    return re.sub(r"\s+", "_", s)


def normalize_skill_id_list(raw: list[str], registry: dict[str, Any]) -> list[str]:
    """Deduplicate, keep order, cap at 2; empty if nothing valid in registry."""
    out: list[str] = []
    seen: set[str] = set()
    for item in raw:
        sid = _normalize_skill_id(str(item))
        if sid in registry and sid not in seen:
            out.append(sid)
            seen.add(sid)
        if len(out) >= 2:
            break
    return out


def resolve_skill_selection_from_milestone_data(
    milestone_data: object,
    registry: dict[str, Any],
) -> tuple[bool, list[str]]:
    """Return (use_llm_skill_selector, fixed_skill_ids).

    When the first value is True, run the LLM selector (ignore fixed list).
    When False, ``fixed_skill_ids`` is non-empty and matches ``registry`` keys.
    """
    if not isinstance(milestone_data, dict):
        return True, []
    if milestone_data.get("milestoneRunSkillMode") != "fixed":
        return True, []
    raw_ids = milestone_data.get("milestoneRunSkillIds")
    if not isinstance(raw_ids, list):
        return True, []
    str_list = [str(x) for x in raw_ids if isinstance(x, str) and x.strip()]
    normalized = normalize_skill_id_list(str_list, registry)
    if not normalized:
        return True, []
    return False, normalized
