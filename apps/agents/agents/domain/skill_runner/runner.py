"""Orchestrate skill load, prefetch, LLM generation, and persist."""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from pathlib import Path
from typing import Any, cast

import httpx
from agents_app.agents.core.milestone_data import persist_milestonedata_markdown
from agents_app.agents.core.milestone_eval.graphql_client import fetch_milestone_children
from agents_app.agents.core.milestone_run.graphql_client import (
    fetch_api_adapter_tools_for_location,
    fetch_prior_milestones_data,
)
from agents_app.agents.core.milestone_run.prompts import (
    execute_skill_task_message,
    workspace_adapter_tools_prompt_suffix,
)
from agents_app.agents.core.milestone_run.tools import make_milestone_run_tools
from agents_app.agents.domain.skill_runner.env import RunEnv, render_human_message
from agents_app.agents.domain.skill_runner.loader import (
    load_skill,
    load_skill_markdown,
    parse_frontmatter,
)
from agents_app.agents.domain.skill_runner.prefetch import prefetch_data_with_steps
from agents_app.models.llm_config import get_llm
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig
from langgraph.prebuilt import create_react_agent

_logger = logging.getLogger(__name__)


def _node_type(ch: dict[str, Any]) -> str:
    return str(ch.get("nodeType") or ch.get("node_type") or "")


def _milestone_children_to_goal_data_criteria(
    children: list[dict[str, Any]],
) -> tuple[str, str, list[dict[str, str]]]:
    goal = ""
    raw_data = ""
    criteria: list[dict[str, str]] = []
    for ch in children:
        nt = _node_type(ch)
        raw = ch.get("data")
        data = raw if isinstance(raw, dict) else {}
        if nt == "goal":
            g = data.get("goal")
            if isinstance(g, str):
                goal = g
        elif nt == "milestonedata":
            d = data.get("data")
            if isinstance(d, str):
                raw_data = d
        elif nt == "passcriteria":
            req = data.get("requirement", "")
            cid = str(ch.get("id", ""))
            if isinstance(req, str) and cid:
                criteria.append({"id": cid, "requirement": req})
    return goal, raw_data, criteria


def _last_ai_text(messages: list[Any]) -> str:
    for m in reversed(messages):
        if isinstance(m, AIMessage):
            c = m.content
            if isinstance(c, str) and c.strip():
                return c.strip()
            if isinstance(c, list):
                parts: list[str] = []
                for block in c:
                    if isinstance(block, dict) and block.get("type") == "text":
                        t = block.get("text")
                        if isinstance(t, str):
                            parts.append(t)
                joined = "".join(parts).strip()
                if joined:
                    return joined
    return ""


def _skill_file_has_menuyukti(path: Path) -> bool:
    raw = path.read_text(encoding="utf-8")
    fm, _ = parse_frontmatter(raw)
    return isinstance(fm.get("menuyukti"), dict)


async def _run_tool_based_prepare(
    skill_path: Path,
    milestone_id: str,
    location_id: int,
    user_id: str,
    workflow_id: str,
    *,
    client: httpx.AsyncClient,
) -> AsyncIterator[dict[str, Any]]:
    md = load_skill_markdown(skill_path)
    skill_folder_id = skill_path.resolve().parent.name

    children = await fetch_milestone_children(
        milestone_id,
        location_id,
        user_id,
        client=client,
    )
    goal, raw_data, criteria = _milestone_children_to_goal_data_criteria(children)

    prior = ""
    wf = workflow_id.strip()
    if wf:
        try:
            prior = await fetch_prior_milestones_data(
                milestone_id,
                wf,
                location_id,
                user_id,
                client=client,
            )
        except Exception:
            _logger.exception(
                "prepare.react: prior milestones fetch failed milestone_id=%s",
                milestone_id,
            )
            raise

    adapters: list[dict[str, Any]] = []
    try:
        adapters = await fetch_api_adapter_tools_for_location(location_id, user_id, client=client)
    except Exception:
        _logger.exception("prepare.react: api adapter tools fetch failed milestone_id=%s", milestone_id)
        raise

    ctx: dict[str, Any] = {
        "goal": goal,
        "raw_data": raw_data,
        "criteria": criteria,
        "prior_milestones_data": prior,
        "workflow_id": wf or None,
        "api_adapter_tools": adapters,
        "result_data": "",
        "milestonedata_written": False,
    }

    tools = make_milestone_run_tools(
        ctx,
        milestone_id,
        location_id,
        user_id,
        client=client,
        skill_id=skill_folder_id,
    )
    system_prompt = md.body + workspace_adapter_tools_prompt_suffix(adapters)
    llm = get_llm()
    agent = create_react_agent(llm, tools, prompt=system_prompt)
    human = execute_skill_task_message(
        skill_folder_id,
        md.name or skill_folder_id,
        goal,
    )

    yield {"step": "generate"}
    result = await agent.ainvoke(
        {"messages": [HumanMessage(content=human)]},
        config=cast(RunnableConfig, {"metadata": {"prepare_skill": skill_folder_id}}),
    )
    msgs = result.get("messages", [])
    if not isinstance(msgs, list):
        msgs = []

    text = str(ctx.get("result_data", "") or "").strip()
    if not text:
        text = _last_ai_text(msgs)
    if not text:
        msg = "Prepare agent produced empty output"
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


async def run_skill_events(
    skill_path: Path | str,
    milestone_id: str,
    location_id: int,
    user_id: str,
    *,
    workflow_id: str = "",
    client: httpx.AsyncClient,
) -> AsyncIterator[dict[str, Any]]:
    """
    Load SKILL.md, then either prefetch + single LLM turn (legacy ``menuyukti``) or ReAct with tools.

    Yields SSE payload dicts: ``{"step": "..."}`` then ``{"done": True, ...}``.
    """
    path = Path(skill_path)
    if not _skill_file_has_menuyukti(path):
        async for payload in _run_tool_based_prepare(
            path,
            milestone_id,
            location_id,
            user_id,
            workflow_id,
            client=client,
        ):
            yield payload
        return

    cfg = load_skill(path)
    env = RunEnv(
        milestone_id=milestone_id,
        location_id=location_id,
        user_id=user_id,
        workflow_id=workflow_id or "",
    )

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
