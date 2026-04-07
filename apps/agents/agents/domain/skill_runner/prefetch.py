"""Resolve skill data_requirements via handler registry."""

from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any

import httpx
from agents_app.agents.domain.skill_runner.env import RunEnv, render_inputs
from agents_app.agents.domain.skill_runner.handlers import PREFETCH_HANDLERS
from agents_app.agents.domain.skill_runner.loader import SkillConfig


async def prefetch_data(
    config: SkillConfig,
    env: RunEnv,
    *,
    client: httpx.AsyncClient,
) -> dict[str, Any]:
    """
    Run each data_requirement in order; return context dict keyed by step id.

    Raises RuntimeError if a required step returns a falsy result.
    """
    context: dict[str, Any] = {}
    async for _step, key, result in prefetch_data_with_steps(config, env, client=client):
        context[key] = result
    return context


async def prefetch_data_with_steps(
    config: SkillConfig,
    env: RunEnv,
    *,
    client: httpx.AsyncClient,
) -> AsyncIterator[tuple[str, str, Any]]:
    """
    Yield (step_name, context_key, result) for each data requirement after running it.

    step_name is ``fetch_<id>`` for SSE compatibility.
    """
    for req in config.menuyukti.data_requirements:
        handler = PREFETCH_HANDLERS.get(req.use)
        if handler is None:
            msg = f"Unknown prefetch handler: {req.use}"
            raise RuntimeError(msg)
        inputs = render_inputs(req.inputs, env)
        result = await handler(inputs, client=client, user_id=env.user_id)
        if req.required and not result:
            msg = f"Required data requirement {req.id!r} returned empty result"
            raise RuntimeError(msg)
        yield f"fetch_{req.id}", req.id, result
