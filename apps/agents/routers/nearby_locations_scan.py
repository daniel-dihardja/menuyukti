"""HTTP endpoint: scan nearby places for restaurant marketing context."""

from __future__ import annotations

import logging
from typing import Annotated, Literal

import httpx
from agents_app.agents.core.llm_invoke import LLMInvokeError
from agents_app.agents.core.nearby_locations import (
    NearbyScanResult,
    PlacesApiError,
    run_nearby_scan,
)
from agents_app.deps import get_http_client
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field

_logger = logging.getLogger(__name__)

router = APIRouter()

FocusId = Literal["lunch_demand", "competitors", "schools", "hotels"]


class NearbyScanRequest(BaseModel):
    location_id: int = Field(alias="locationId", ge=1)
    address: str = Field(min_length=1, max_length=512)
    instructions: str | None = Field(default=None, max_length=4000)
    focus: list[FocusId] = Field(min_length=1, max_length=4)

    model_config = {"populate_by_name": True}


class NearbyScanResponse(BaseModel):
    origin: dict
    nodes: list[dict]


def _node_to_camel(result: NearbyScanResult) -> NearbyScanResponse:
    return NearbyScanResponse(
        origin=result.origin.model_dump(by_alias=True),
        nodes=[n.model_dump(by_alias=True) for n in result.nodes],
    )


@router.post(
    "/playbooks/nearby-locations/scan",
    response_model=NearbyScanResponse,
)
async def scan_nearby_locations(
    body: NearbyScanRequest,
    http_client: Annotated[httpx.AsyncClient, Depends(get_http_client)],
    x_menuyukti_user_id: Annotated[str | None, Header(alias="X-Menuyukti-User-Id")] = None,
) -> NearbyScanResponse:
    if not x_menuyukti_user_id or not x_menuyukti_user_id.strip():
        raise HTTPException(status_code=401, detail="Missing X-Menuyukti-User-Id")

    user_id = x_menuyukti_user_id.strip()
    # location_id reserved for future GraphQL context; scan is address-driven.
    _ = body.location_id

    try:
        result = await run_nearby_scan(
            client=http_client,
            address=body.address,
            focus=list(body.focus),
            instructions=body.instructions,
            reporting_user=user_id,
        )
    except PlacesApiError as exc:
        _logger.error("nearby_scan places failed: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except LLMInvokeError as exc:
        _logger.error("nearby_scan llm failed: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        _logger.exception("nearby_scan unexpected error")
        raise HTTPException(
            status_code=502,
            detail=f"Failed to scan nearby locations: {exc}",
        ) from exc

    return _node_to_camel(result)
