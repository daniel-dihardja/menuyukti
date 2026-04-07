"""Orchestrate skill load, prefetch, LLM generation, and persist."""

from __future__ import annotations

from collections.abc import AsyncIterator
from pathlib import Path
from typing import Any

import httpx
from agents_app.agents.core.milestone_data import persist_milestonedata_markdown
from agents_app.agents.domain.skill_runner.env import RunEnv, render_human_message
from agents_app.agents.domain.skill_runner.loader import load_skill
from agents_app.agents.domain.skill_runner.prefetch import prefetch_data_with_steps
from agents_app.models.llm_config import get_llm
from langchain_core.messages import HumanMessage, SystemMessage


async def run_skill_events(
    skill_path: Path | str,
    milestone_id: str,
    location_id: int,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> AsyncIterator[dict[str, Any]]:
    """
    Load SKILL.md, prefetch data per ``data_requirements``, render ``human_message_template``,
    stream LLM output, persist Markdown to milestone data.

    Yields SSE payload dicts: ``{"step": "..."}`` then ``{"done": True, ...}``.
    """
    cfg = load_skill(skill_path)
    env = RunEnv(milestone_id=milestone_id, location_id=location_id, user_id=user_id)

    context: dict[str, Any] = {}
    async for _step_name, key, result in prefetch_data_with_steps(cfg, env, client=client):
        yield {"step": f"fetch_{key}"}
        context[key] = result

    human_content = render_human_message(cfg.menuyukti.human_message_template, context)
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
        msg = "Generated text is empty"
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
