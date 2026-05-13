"""Tests for deterministic IG Profile milestone eval checks."""

from __future__ import annotations

from agents_app.agents.core.milestone_eval.ig_profile_eval import (
    enrich_ig_profile_eval_payload,
    parse_milestone_data_from_eval_raw,
    try_ig_profile_deterministic_verdict,
)

_BIO_LENGTH_REQ = "Each **bio variation** text is at most **150 characters** (Instagram hard limit)."
_USERNAMES_REQ = (
    "Data includes **3–5 username suggestions** in valid Instagram format, "
    "each with a one-line rationale."
)
_BREAKDOWN_REQ = (
    "Each bio variation breakdown covers **hook**, **value prop**, **CTA**, and **tone**, "
    "grounded in Campaign Brief context."
)
_VARIATIONS_REQ = "Data includes **3 distinct bio variations** in the bios array."


def _bio(text: str = "Short bio.") -> dict:
    return {
        "text": text,
        "hook": "Opens with venue identity.",
        "valueProp": "Promises seasonal plates.",
        "cta": "Reserve a table.",
        "tone": "Warm and contemporary.",
    }


def _sample_payload(bio_text: str = "Short bio.") -> dict:
    return {
        "usernames": [
            {"username": "cafe.berlin", "rationale": "City + venue type."},
            {"username": "eat_at_cafe", "rationale": "Memorable action handle."},
            {"username": "cafe_kitchen", "rationale": "Highlights food focus."},
        ],
        "bios": [
            _bio(bio_text),
            _bio("Second variation bio."),
            _bio("Third variation bio."),
        ],
    }


def test_bio_length_passes_when_all_within_limit() -> None:
    payload = _sample_payload("A" * 150)
    verdict = try_ig_profile_deterministic_verdict(_BIO_LENGTH_REQ, payload)
    assert verdict is not None
    assert verdict[0] == "pass"
    assert "150" in verdict[1]


def test_bio_length_fails_when_any_over_limit() -> None:
    payload = _sample_payload("A" * 150)
    payload["bios"][1]["text"] = "B" * 151
    verdict = try_ig_profile_deterministic_verdict(_BIO_LENGTH_REQ, payload)
    assert verdict is not None
    assert verdict[0] == "fail"
    assert "#2=151" in verdict[1]


def test_enrich_payload_adds_character_count_hints() -> None:
    payload = _sample_payload("Hello world")
    enriched = enrich_ig_profile_eval_payload(payload)
    assert enriched["_evalHints"]["bioVariationCount"] == 3
    assert enriched["_evalHints"]["allBiosWithinInstagramLimit"] is True


def test_parse_milestone_data_strips_prior_context_suffix() -> None:
    raw = (
        '{\n  "usernames": [],\n  "bios": []\n}'
        "\n\n---\nPrior milestone context (for requirement checks):\n## Brief\n"
    )
    parsed = parse_milestone_data_from_eval_raw(raw)
    assert parsed is not None
    assert "bios" in parsed


def test_usernames_breakdown_and_variation_verdicts() -> None:
    payload = _sample_payload()
    assert try_ig_profile_deterministic_verdict(_USERNAMES_REQ, payload)[0] == "pass"
    assert try_ig_profile_deterministic_verdict(_BREAKDOWN_REQ, payload)[0] == "pass"
    assert try_ig_profile_deterministic_verdict(_VARIATIONS_REQ, payload)[0] == "pass"
