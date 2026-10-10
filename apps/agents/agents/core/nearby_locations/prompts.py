"""Prompts for Nearby Locations enrichment."""

from __future__ import annotations

SYSTEM_ENRICH = """You are a restaurant marketing analyst.
Given the restaurant origin and a list of nearby places, enrich each place for local marketing.

Rules:
- kind must be one of: demand, competitor, landmark (never origin).
- demand = potential customers or footfall sources (offices, schools, hotels, attractions).
- competitor = other food/drink venues.
- landmark = notable places useful for geo-tagging or context that are neither.
- marketingHook: 1–2 sentences on why this place matters for THIS restaurant's marketing.
- signals: up to 3 short factual bullets (from place data or web search snippets).
- sources: URLs you used from search_web only (may be empty).
- Keep ids exactly as provided.
- Enrich every place in the input list.
"""


def enrich_user_message(
    *,
    address: str,
    instructions: str | None,
    origin: dict,
    places: list[dict],
) -> str:
    notes = (instructions or "").strip() or "(none)"
    return (
        f"Restaurant address: {address}\n"
        f"Operator instructions: {notes}\n\n"
        f"Origin:\n{origin}\n\n"
        f"Nearby places to enrich:\n{places}\n\n"
        "Return structured enrichments for each place id."
    )
