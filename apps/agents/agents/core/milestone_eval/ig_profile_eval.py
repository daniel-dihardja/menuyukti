"""Deterministic pass/fail checks for IG Profile milestone criteria (avoid LLM character counting)."""

from __future__ import annotations

import json
import re
from typing import Any, Literal

_IG_USERNAME_RE = re.compile(r"^[a-zA-Z0-9._]+$")
_BIO_MAX_CHARS = 150
_BIO_VARIATION_COUNT = 3
_PRIOR_CONTEXT_SPLIT = "\n\n---\nPrior milestone context"

DeterministicVerdict = tuple[Literal["pass", "fail"], str]


def _normalize_requirement(requirement: str) -> str:
    return re.sub(r"\*+", "", requirement).strip().lower()


def _bios_from_data(data: dict[str, Any]) -> list[dict[str, Any]]:
    raw_bios = data.get("bios")
    if isinstance(raw_bios, list):
        return [row for row in raw_bios if isinstance(row, dict)]
    legacy_bio = data.get("bio")
    if isinstance(legacy_bio, dict):
        return [legacy_bio]
    return []


def parse_milestone_data_from_eval_raw(raw_data: str) -> dict[str, Any] | None:
    """Parse the primary milestone JSON blob from eval ``raw_data`` (may include prior context)."""
    text = raw_data.strip()
    if not text:
        return None
    main = text.split(_PRIOR_CONTEXT_SPLIT, 1)[0].strip()
    try:
        parsed = json.loads(main)
    except json.JSONDecodeError:
        return None
    return parsed if isinstance(parsed, dict) else None


def is_ig_profile_milestone_data(data: dict[str, Any]) -> bool:
    usernames = data.get("usernames")
    return isinstance(usernames, list) and (
        isinstance(data.get("bios"), list) or isinstance(data.get("bio"), dict)
    )


def enrich_ig_profile_eval_payload(data: dict[str, Any]) -> dict[str, Any]:
    """Attach explicit character-count hints for eval consumers (not persisted)."""
    if not is_ig_profile_milestone_data(data):
        return data
    bios = _bios_from_data(data)
    enriched = dict(data)
    enriched["_evalHints"] = {
        "bioVariationCount": len(bios),
        "bioTextCharacterCounts": [len(str(bio.get("text", "")).strip()) for bio in bios],
        "bioTextMaxCharacters": _BIO_MAX_CHARS,
        "allBiosWithinInstagramLimit": all(
            len(str(bio.get("text", "")).strip()) <= _BIO_MAX_CHARS for bio in bios
        ),
        "bioTextField": "bios[].text",
    }
    return enriched


def try_ig_profile_deterministic_verdict(
    requirement: str,
    data: dict[str, Any],
) -> DeterministicVerdict | None:
    """Return a verdict when ``data`` is IG Profile-shaped and the requirement is checkable without an LLM."""
    if not is_ig_profile_milestone_data(data):
        return None

    norm = _normalize_requirement(requirement)
    usernames = data.get("usernames")
    assert isinstance(usernames, list)
    bios = _bios_from_data(data)

    if "150" in norm and "bio" in norm and "character" in norm:
        if len(bios) != _BIO_VARIATION_COUNT:
            return (
                "fail",
                f"expected {_BIO_VARIATION_COUNT} bio variations, found {len(bios)}.",
            )
        over_limit = [
            (idx, len(str(bio.get("text", "")).strip()))
            for idx, bio in enumerate(bios, start=1)
            if len(str(bio.get("text", "")).strip()) > _BIO_MAX_CHARS
        ]
        if over_limit:
            parts = ", ".join(f"#{idx}={count} chars" for idx, count in over_limit)
            return (
                "fail",
                f"bio variation(s) exceed {_BIO_MAX_CHARS} characters: {parts}.",
            )
        counts = [len(str(bio.get("text", "")).strip()) for bio in bios]
        return (
            "pass",
            (
                f"all {_BIO_VARIATION_COUNT} bio variations are within {_BIO_MAX_CHARS} characters "
                f"(counts: {', '.join(str(c) for c in counts)})."
            ),
        )

    if "username" in norm and ("3" in norm or "3–5" in norm or "3-5" in norm):
        issues: list[str] = []
        if not (3 <= len(usernames) <= 5):
            issues.append(f"expected 3–5 username suggestions, found {len(usernames)}")
        seen: set[str] = set()
        for idx, row in enumerate(usernames, start=1):
            if not isinstance(row, dict):
                issues.append(f"username #{idx} is not an object")
                continue
            username = str(row.get("username", "")).strip().lstrip("@")
            rationale = str(row.get("rationale", "")).strip()
            if not username:
                issues.append(f"username #{idx} is empty")
            elif len(username) > 30:
                issues.append(f"username #{idx} exceeds 30 characters")
            elif not _IG_USERNAME_RE.fullmatch(username):
                issues.append(f"username #{idx} has invalid Instagram format")
            key = username.casefold()
            if key in seen:
                issues.append(f"duplicate username @{username}")
            seen.add(key)
            if not rationale:
                issues.append(f"username #{idx} is missing a rationale")
        if issues:
            detail = "; ".join(issues[:3]) + ("…" if len(issues) > 3 else "")
            return ("fail", detail)
        return (
            "pass",
            f"{len(usernames)} username suggestions with valid format and rationales.",
        )

    if "bio breakdown" in norm or ("hook" in norm and "value prop" in norm and "tone" in norm):
        if len(bios) != _BIO_VARIATION_COUNT:
            return (
                "fail",
                f"expected {_BIO_VARIATION_COUNT} bio variations with breakdowns, found {len(bios)}.",
            )
        for idx, bio in enumerate(bios, start=1):
            fields = {
                "hook": str(bio.get("hook", "")).strip(),
                "valueProp": str(bio.get("valueProp", "")).strip(),
                "cta": str(bio.get("cta", "")).strip(),
                "tone": str(bio.get("tone", "")).strip(),
            }
            missing = [name for name, value in fields.items() if not value]
            if missing:
                return (
                    "fail",
                    f"bio variation #{idx} missing non-empty fields: {', '.join(missing)}.",
                )
        return (
            "pass",
            f"all {_BIO_VARIATION_COUNT} bio variations include hook, value prop, CTA, and tone.",
        )

    if "bio variation" in norm or ("three" in norm and "bio" in norm):
        if len(bios) == _BIO_VARIATION_COUNT:
            return ("pass", f"data includes {_BIO_VARIATION_COUNT} bio variations.")
        return ("fail", f"expected {_BIO_VARIATION_COUNT} bio variations, found {len(bios)}.")

    return None
