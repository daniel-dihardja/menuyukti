"""Nearby Locations scan: Places fetch + ReAct enrichment (optional Tavily)."""

from __future__ import annotations

import logging
import uuid
from typing import Any

import httpx
from agents_app.agents.core.llm_invoke import LLMInvokeError, structured_ainvoke_with_retry
from agents_app.agents.core.nearby_locations.focus_queries import (
    default_kind_for_focus,
    included_types_for_focus,
    text_query_for_focus,
)
from agents_app.agents.core.nearby_locations.models import (
    EnrichmentBatch,
    NearbyFocusId,
    NearbyScanNode,
    NearbyScanResult,
)
from agents_app.agents.core.nearby_locations.places_client import (
    MAX_PER_FOCUS,
    MAX_PLACES_TOTAL,
    PlacesApiError,
    geocode_address,
    haversine_meters,
    search_nearby,
    search_text,
)
from agents_app.agents.core.nearby_locations.prompts import SYSTEM_ENRICH, enrich_user_message
from agents_app.agents.core.tavily_search_tool import make_search_web_tool
from agents_app.models.llm_config import get_llm_structured
from langchain.agents import create_agent
from langchain_core.messages import HumanMessage, SystemMessage

_logger = logging.getLogger(__name__)

SCAN_RECURSION_LIMIT = 16
MAX_WEB_SEARCHES = 8
MAX_ENRICH_NODES = 20


def _node_id() -> str:
    return uuid.uuid4().hex[:12]


def _origin_node(place: dict[str, Any], *, address: str) -> NearbyScanNode:
    return NearbyScanNode(
        id=_node_id(),
        kind="origin",
        name=str(place.get("name") or "Restaurant"),
        placeId=place.get("placeId"),
        lat=float(place["lat"]),
        lng=float(place["lng"]),
        types=list(place.get("types") or []),
        rating=place.get("rating"),
        address=place.get("address") or address,
        distanceMeters=0,
        signals=[],
        marketingHook=None,
        sources=[],
    )


def _raw_to_node(
    place: dict[str, Any],
    *,
    origin_lat: float,
    origin_lng: float,
    default_kind: str,
) -> NearbyScanNode:
    dist = haversine_meters(origin_lat, origin_lng, float(place["lat"]), float(place["lng"]))
    sources: list[str] = []
    maps_uri = place.get("googleMapsUri")
    if isinstance(maps_uri, str) and maps_uri.strip():
        sources.append(maps_uri.strip())
    return NearbyScanNode(
        id=_node_id(),
        kind=default_kind,  # type: ignore[arg-type]
        name=str(place["name"]),
        placeId=place.get("placeId"),
        lat=float(place["lat"]),
        lng=float(place["lng"]),
        types=list(place.get("types") or []),
        rating=place.get("rating"),
        address=place.get("address"),
        distanceMeters=dist,
        signals=[],
        marketingHook=None,
        sources=sources,
    )


async def _collect_places(
    client: httpx.AsyncClient,
    *,
    origin: dict[str, Any],
    address: str,
    focus: list[NearbyFocusId],
) -> list[NearbyScanNode]:
    origin_lat = float(origin["lat"])
    origin_lng = float(origin["lng"])
    origin_place_id = origin.get("placeId")
    seen: set[str] = set()
    if isinstance(origin_place_id, str) and origin_place_id:
        seen.add(origin_place_id)

    nodes: list[NearbyScanNode] = []
    for chip in focus:
        if len(nodes) >= MAX_PLACES_TOTAL:
            break
        remaining = MAX_PLACES_TOTAL - len(nodes)
        limit = min(MAX_PER_FOCUS, remaining)
        kinds_default = default_kind_for_focus(chip)
        try:
            raw_list = await search_nearby(
                client,
                lat=origin_lat,
                lng=origin_lng,
                included_types=included_types_for_focus(chip),
                max_result_count=limit,
            )
        except PlacesApiError:
            _logger.warning("searchNearby failed for focus=%s; falling back to text search", chip)
            raw_list = await search_text(
                client,
                text_query=text_query_for_focus(chip, address),
                max_result_count=limit,
            )

        for raw in raw_list:
            if len(nodes) >= MAX_PLACES_TOTAL:
                break
            pid = raw.get("placeId")
            if isinstance(pid, str) and pid in seen:
                continue
            if isinstance(pid, str):
                seen.add(pid)
            # Skip if essentially the origin coordinates
            if (
                abs(float(raw["lat"]) - origin_lat) < 1e-5
                and abs(float(raw["lng"]) - origin_lng) < 1e-5
            ):
                continue
            nodes.append(
                _raw_to_node(
                    raw,
                    origin_lat=origin_lat,
                    origin_lng=origin_lng,
                    default_kind=kinds_default,
                )
            )
    nodes.sort(key=lambda n: n.distance_meters if n.distance_meters is not None else 10**9)
    return nodes


async def _enrich_nodes(
    *,
    address: str,
    instructions: str | None,
    origin: NearbyScanNode,
    nodes: list[NearbyScanNode],
    reporting_user: str | None,
) -> list[NearbyScanNode]:
    if not nodes:
        return []

    to_enrich = nodes[:MAX_ENRICH_NODES]
    search_tool = make_search_web_tool()
    tools = [search_tool] if search_tool is not None else []

    place_payload = [
        {
            "id": n.id,
            "name": n.name,
            "types": n.types,
            "rating": n.rating,
            "address": n.address,
            "distanceMeters": n.distance_meters,
            "defaultKind": n.kind,
        }
        for n in to_enrich
    ]
    origin_payload = {
        "name": origin.name,
        "address": origin.address,
        "lat": origin.lat,
        "lng": origin.lng,
    }
    user_msg = enrich_user_message(
        address=address,
        instructions=instructions,
        origin=origin_payload,
        places=place_payload,
    )

    # Budget note for the agent when search is available.
    if tools:
        user_msg += (
            f"\n\nYou may call search_web at most {MAX_WEB_SEARCHES} times "
            "for the most important places. Prefer Places data when enough."
        )

    llm = get_llm_structured(
        reporting_user=reporting_user,
        reporting_tags=["playbook", "nearby_locations"],
    )

    try:
        if tools:
            agent = create_agent(
                model=llm,
                tools=tools,
                system_prompt=SYSTEM_ENRICH,
                response_format=EnrichmentBatch,
                name="nearby_locations_enrich",
            )
            result = await agent.ainvoke(
                {"messages": [HumanMessage(content=user_msg)]},
                {"recursion_limit": SCAN_RECURSION_LIMIT},
            )
            structured = result.get("structured_response")
            if isinstance(structured, EnrichmentBatch):
                batch = structured
            elif isinstance(structured, dict):
                batch = EnrichmentBatch.model_validate(structured)
            else:
                batch = await structured_ainvoke_with_retry(
                    llm,
                    EnrichmentBatch,
                    [
                        SystemMessage(content=SYSTEM_ENRICH),
                        HumanMessage(content=user_msg),
                    ],
                )
        else:
            batch = await structured_ainvoke_with_retry(
                llm,
                EnrichmentBatch,
                [
                    SystemMessage(content=SYSTEM_ENRICH),
                    HumanMessage(content=user_msg),
                ],
            )
    except (LLMInvokeError, Exception) as exc:
        _logger.warning("nearby enrichment failed; returning Places-only nodes: %s", exc)
        return nodes

    by_id = {item.id: item for item in batch.nodes}
    merged: list[NearbyScanNode] = []
    for node in nodes:
        item = by_id.get(node.id)
        if item is None:
            merged.append(node)
            continue
        kind = item.kind if item.kind != "origin" else node.kind
        merged.append(
            node.model_copy(
                update={
                    "kind": kind,
                    "signals": item.signals[:5],
                    "marketing_hook": item.marketing_hook.strip() or None,
                    "sources": list(dict.fromkeys([*node.sources, *item.sources]))[:8],
                }
            )
        )
    return merged


async def run_nearby_scan(
    *,
    client: httpx.AsyncClient,
    address: str,
    focus: list[NearbyFocusId],
    instructions: str | None = None,
    reporting_user: str | None = None,
) -> NearbyScanResult:
    """Geocode, collect nearby Places (budgeted), enrich with optional web search + LLM."""
    cleaned = address.strip()
    if not cleaned:
        raise PlacesApiError("Address is required")
    if not focus:
        raise PlacesApiError("At least one focus chip is required")

    origin_place = await geocode_address(client, address=cleaned)
    origin = _origin_node(origin_place, address=cleaned)
    nodes = await _collect_places(
        client,
        origin=origin_place,
        address=cleaned,
        focus=focus,
    )
    enriched = await _enrich_nodes(
        address=cleaned,
        instructions=instructions,
        origin=origin,
        nodes=nodes,
        reporting_user=reporting_user,
    )
    return NearbyScanResult(origin=origin, nodes=enriched)
