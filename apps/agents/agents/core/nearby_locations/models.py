"""Pydantic models for Nearby Locations scan I/O."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

NearbyFocusId = Literal["lunch_demand", "competitors", "schools", "hotels"]
NearbyNodeKind = Literal["demand", "competitor", "landmark", "origin"]

FOCUS_IDS: tuple[NearbyFocusId, ...] = (
    "lunch_demand",
    "competitors",
    "schools",
    "hotels",
)


class NearbyScanNode(BaseModel):
    id: str
    kind: NearbyNodeKind
    name: str
    place_id: str | None = Field(default=None, alias="placeId")
    lat: float
    lng: float
    types: list[str] = Field(default_factory=list)
    rating: float | None = None
    address: str | None = None
    distance_meters: int | None = Field(default=None, alias="distanceMeters")
    signals: list[str] = Field(default_factory=list)
    marketing_hook: str | None = Field(default=None, alias="marketingHook")
    sources: list[str] = Field(default_factory=list)

    model_config = {"populate_by_name": True}


class NearbyScanResult(BaseModel):
    origin: NearbyScanNode
    nodes: list[NearbyScanNode] = Field(default_factory=list)


class NodeEnrichment(BaseModel):
    id: str
    kind: NearbyNodeKind = "demand"
    signals: list[str] = Field(default_factory=list)
    marketing_hook: str = Field(default="", alias="marketingHook")
    sources: list[str] = Field(default_factory=list)

    model_config = {"populate_by_name": True}


class EnrichmentBatch(BaseModel):
    nodes: list[NodeEnrichment] = Field(default_factory=list)
