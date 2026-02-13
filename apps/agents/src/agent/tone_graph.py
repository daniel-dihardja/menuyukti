from __future__ import annotations

import os
from typing import Any, cast

from langchain_openai import ChatOpenAI
import logging
from langgraph.graph import StateGraph
from langgraph.runtime import Runtime
from pydantic import BaseModel, Field
from typing_extensions import NotRequired, TypedDict

from agent.graph import graph as audience_graph

class ToneOutputs(TypedDict):
    tone_profile: str
    language_guidelines: str
    caption_style: str
    hashtag_style: str
    content_dos_donts: str
    post_concepts: str
    cta_phrases: str
    emoji_guidelines: str


class ToneOutputsModel(BaseModel):
    tone_profile: str = Field(..., min_length=1)
    language_guidelines: str = Field(..., min_length=1)
    caption_style: str = Field(..., min_length=1)
    hashtag_style: str = Field(..., min_length=1)
    content_dos_donts: str = Field(..., min_length=1)
    post_concepts: str = Field(..., min_length=1)
    cta_phrases: str = Field(..., min_length=1)
    emoji_guidelines: str = Field(..., min_length=1)


class AudienceOutputs(TypedDict):
    top_items: list[str]
    peak_hours: list[str]
    weekday_bias: str
    daypart_demand_distribution: str
    weekday_demand_distribution: str
    audience_intent_clusters: list[str]
    party_size_signal: str
    social_dining_probability: str
    audience_mix_summary: str
    analysis_window: str
    popularity_index_summary: str
    top_item_revenue_share: str
    category_mix: str


class Context(TypedDict):
    locale: NotRequired[str]
    branch_id: NotRequired[int]
    analytics_id: NotRequired[int]


class State(TypedDict):
    core_input: NotRequired[dict[str, Any]]
    audience_outputs: NotRequired[AudienceOutputs]
    outputs: NotRequired[ToneOutputs]
    title: NotRequired[str]

logger = logging.getLogger(__name__)


def _format_tone_profile(outputs: AudienceOutputs) -> str:
    weekday_bias = outputs.get("weekday_bias", "balanced")
    party_size_signal = outputs.get("party_size_signal", "mixed parties")
    return (
        f"{weekday_bias.title()} energy with a {party_size_signal} feel. "
        "Warm, modern, and appetite-forward."
    )


def _build_outputs(outputs: AudienceOutputs | None) -> ToneOutputs:
    audience = outputs or {}
    top_items = audience.get("top_items") or []
    top_item_focus = top_items[0] if top_items else "signature items"
    weekday_bias = audience.get("weekday_bias", "balanced")

    return {
        "tone_profile": _format_tone_profile(audience),
        "language_guidelines": (
            "Use Bahasa with light English. Keep sentences short, friendly, "
            "and confident. Avoid jargon."
        ),
        "caption_style": (
            f"Hook + {top_item_focus} highlight + social proof + CTA. "
            f"Emphasize {weekday_bias} demand moments."
        ),
        "hashtag_style": (
            "3-5 branded tags, 3-5 local foodie tags, and 1-2 category tags. "
            "Keep under 10 total."
        ),
        "content_dos_donts": (
            f"Do spotlight top sellers like {top_item_focus}. "
            "Don't overuse discounts or long paragraphs."
        ),
        "post_concepts": (
            "1) Top seller spotlight, 2) Limited offer countdown, "
            "3) Behind-the-scenes prep."
        ),
        "cta_phrases": "Try it today, Order now, Tag a foodie friend.",
        "emoji_guidelines": (
            "1-3 per caption, use food and location emojis, avoid repeats."
        ),
    }


def _llm_enabled() -> bool:
    return True


def _llm_required() -> bool:
    return os.getenv("TONE_AGENT_REQUIRE_LLM") == "1"


def _get_model_name() -> str:
    return os.getenv("OPENAI_TONE_MODEL") or "gpt-4o-mini"


def _build_llm_prompt(outputs: AudienceOutputs | None) -> str:
    audience_context = outputs or {}
    return (
        "You are a restaurant marketing strategist. "
        "Generate Instagram tone guidance and content planning outputs. "
        "Keep each value concise (1-2 sentences) except post_concepts and "
        "cta_phrases which should be short lists in a single string. "
        f"Audience outputs: {audience_context}."
    )


async def _build_llm_outputs(outputs: AudienceOutputs | None) -> ToneOutputs:
    model = _get_model_name()
    logger.info(
        "tone_agent_llm_call_start",
        extra={
            "model": model,
            "has_openai_api_key": bool(os.getenv("OPENAI_API_KEY")),
        },
    )
    llm = ChatOpenAI(model=model, temperature=0.2, timeout=20)
    structured_llm = llm.with_structured_output(ToneOutputsModel)
    prompt = _build_llm_prompt(outputs)
    response = await structured_llm.ainvoke(prompt)
    logger.info("tone_agent_llm_call_success")
    data = response.model_dump()
    return cast(ToneOutputs, data)


async def run_audience_dependency(
    state: State, runtime: Runtime[Context]
) -> dict[str, Any]:
    core_input = state.get("core_input", {})
    audience_result = await audience_graph.ainvoke(
        {"core_input": core_input}, config={"context": runtime.context}
    )
    return {
        "audience_outputs": audience_result.get("outputs", {}),
    }


async def run_tone_agent(state: State, runtime: Runtime[Context]) -> dict[str, Any]:
    audience_outputs = cast(
        AudienceOutputs, state.get("audience_outputs", {}) or {}
    )
    if _llm_enabled():
        try:
            outputs = await _build_llm_outputs(audience_outputs)
        except Exception:
            logger.exception("tone_agent_llm_call_failed")
            if _llm_required():
                raise
            outputs = _build_outputs(audience_outputs)
    else:
        outputs = _build_outputs(audience_outputs)
    analytics_id = (runtime.context or {}).get("analytics_id")

    return {
        "audience_outputs": audience_outputs,
        "outputs": outputs,
        "title": (
            f"tone-agent-{analytics_id}" if analytics_id is not None else "tone-agent"
        ),
    }


graph = (
    StateGraph(State, context_schema=Context)
    .add_node("run_audience_dependency", run_audience_dependency)
    .add_node("run_tone_agent", run_tone_agent)
    .add_edge("__start__", "run_audience_dependency")
    .add_edge("run_audience_dependency", "run_tone_agent")
    .compile(name="ToneAgentGraph")
)
