"""Guest preference purposes, signal categories, and source types."""

from __future__ import annotations

PURPOSE_PREFERENCE_COLLECTION = "preference_collection"
PURPOSE_CROSS_VENUE_PERSONALIZATION = "cross_venue_personalization"

# Legacy single purpose from foundation v1 — rejected for new grants.
LEGACY_PURPOSE_CROSS_RESTAURANT_PERSONALIZATION = "cross_restaurant_personalization"

KNOWN_PURPOSES: frozenset[str] = frozenset(
    {
        PURPOSE_PREFERENCE_COLLECTION,
        PURPOSE_CROSS_VENUE_PERSONALIZATION,
    }
)

SIGNAL_CATEGORY_VOTING = "voting"
SIGNAL_CATEGORY_EXPLICIT = "explicit"
SIGNAL_CATEGORY_ORDER_FUTURE = "order_future"

# Pick & Win / prediction is intentionally absent — not a food-preference category.
KNOWN_SIGNAL_CATEGORIES: frozenset[str] = frozenset(
    {
        SIGNAL_CATEGORY_VOTING,
        SIGNAL_CATEGORY_EXPLICIT,
        SIGNAL_CATEGORY_ORDER_FUTURE,
    }
)

SOURCE_TYPE_VOTING_VOTE = "voting_vote"
SOURCE_TYPE_PREDICTION_VOTE = "prediction_vote"
SOURCE_TYPE_EXPLICIT = "explicit"
SOURCE_TYPE_ORDER = "order"

ORIGIN_KIND_EXPLICIT = "explicit"
ORIGIN_KIND_INFERRED = "inferred"
KNOWN_ORIGIN_KINDS: frozenset[str] = frozenset(
    {
        ORIGIN_KIND_EXPLICIT,
        ORIGIN_KIND_INFERRED,
    }
)

# Map source types to consent signal categories (eligibility gate).
SOURCE_TYPE_TO_CATEGORY: dict[str, str | None] = {
    SOURCE_TYPE_VOTING_VOTE: SIGNAL_CATEGORY_VOTING,
    SOURCE_TYPE_PREDICTION_VOTE: None,  # never food-preference eligible
    SOURCE_TYPE_EXPLICIT: SIGNAL_CATEGORY_EXPLICIT,
    SOURCE_TYPE_ORDER: SIGNAL_CATEGORY_ORDER_FUTURE,
}

ENV_FEATURE_FLAG = "GUEST_PREFERENCE_NETWORK_ENABLED"


def normalize_purpose(raw: str) -> str:
    key = (raw or "").strip()
    if key == LEGACY_PURPOSE_CROSS_RESTAURANT_PERSONALIZATION:
        raise ValueError(
            "Legacy purpose cross_restaurant_personalization is superseded; "
            "use preference_collection or cross_venue_personalization"
        )
    if key not in KNOWN_PURPOSES:
        raise ValueError(f"Unknown preference purpose: {raw}")
    return key


def normalize_signal_categories(raw: list[str] | None) -> list[str]:
    if not raw:
        raise ValueError("allowed_signal_categories must be non-empty")
    seen: set[str] = set()
    out: list[str] = []
    for item in raw:
        key = str(item).strip()
        if not key:
            continue
        if key not in KNOWN_SIGNAL_CATEGORIES:
            raise ValueError(f"Unknown signal category: {item}")
        if key not in seen:
            seen.add(key)
            out.append(key)
    if not out:
        raise ValueError("allowed_signal_categories must be non-empty")
    return out


def normalize_origin_kind(raw: str) -> str:
    key = (raw or "").strip()
    if key not in KNOWN_ORIGIN_KINDS:
        raise ValueError(f"Unknown origin_kind: {raw}")
    return key
