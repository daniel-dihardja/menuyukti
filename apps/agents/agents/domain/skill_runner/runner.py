"""Orchestrate skill load, prefetch, LLM generation, and persist."""

from __future__ import annotations

import json
from collections.abc import AsyncIterator
from pathlib import Path
from typing import Any

import httpx
from agents_app.agents.core.milestone_data import persist_milestonedata_markdown
from agents_app.agents.domain.skill_runner.env import RunEnv
from agents_app.agents.domain.skill_runner.loader import load_skill
from agents_app.agents.domain.skill_runner.prefetch import prefetch_data_with_steps
from agents_app.models.llm_config import get_llm
from langchain_core.messages import HumanMessage, SystemMessage


def _location_profile_human_message(
    operating_profile: dict[str, Any],
    *,
    location: dict[str, Any] | None = None,
) -> str:
    """Format prefetched JSON for the LLM user message (same structure as legacy prompts)."""
    metrics_payload = json.dumps(operating_profile, indent=2, ensure_ascii=False)
    parts = [
        "Operating profile (JSON from POS analytics):\n" + metrics_payload,
    ]
    if location:
        loc_payload = json.dumps(location, indent=2, ensure_ascii=False)
        parts.append("Location record (JSON from platform):\n" + loc_payload)
    parts.append("Write the location profile in Markdown.")
    return "\n\n".join(parts)


async def run_skill_events(
    skill_path: Path | str,
    milestone_id: str,
    location_id: int,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> AsyncIterator[dict[str, Any]]:
    """
    Same logical steps as the legacy location profile graph: prefetch, generate, persist.

    Yields SSE payload dicts: ``{"step": "..."}`` then ``{"done": True, ...}``.
    """
    cfg = load_skill(skill_path)
    env = RunEnv(milestone_id=milestone_id, location_id=location_id, user_id=user_id)

    context: dict[str, Any] = {}
    async for _step_name, key, result in prefetch_data_with_steps(cfg, env, client=client):
        yield {"step": f"fetch_{key}"}
        context[key] = result

    operating = context.get("operating_profile") or {}
    location = context.get("location")
    if not isinstance(operating, dict):
        msg = "operating_profile context must be a dict"
        raise RuntimeError(msg)

    human_content = _location_profile_human_message(operating, location=location)
    messages = [
        SystemMessage(content=cfg.body),
        HumanMessage(content=human_content),
    ]

    yield {"step": "generate"}
    llm = get_llm()
    full = ""
    async for chunk in llm.astream(messages):
        c = chunk.content
        if isinstance(c, str):
            full += c
        elif isinstance(c, list):
            full += "".join(str(x) for x in c)
    text = full.strip()
    if not text:
        msg = "Generated profile is empty"
        raise RuntimeError(msg)

    yield {"step": "persist"}
    milestonedata_id = await persist_milestonedata_markdown(
        milestone_id,
        location_id,
        user_id,
        text,
        client=client,
    )

    yield {
        "done": True,
        "dataPreview": text,
        "milestonedataId": str(milestonedata_id or ""),
    }
