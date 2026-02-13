from __future__ import annotations

import os
from typing import Any, cast

from langchain_openai import ChatOpenAI
import logging
from langgraph.graph import StateGraph
from langgraph.runtime import Runtime
from marketing_engine.features.audience import derive_audience_features_from_core_input
from pydantic import BaseModel, Field
from typing_extensions import NotRequired, TypedDict


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


class AudienceFeatures(TypedDict):
    top_items: list[str]
    peak_hours: list[str]
    weekday_bias: str
    daypart_profile: dict[str, float]
    weekday_profile: dict[str, float]
    party_size_signal: str
    social_dining_score: float
    avg_order_items: float
    avg_order_revenue: float
    top_item_revenue_share_ratio: float
    popularity_index_coverage: int
    primary_category: str
    analysis_window_days: NotRequired[int]
    intent_hints: list[str]


class Context(TypedDict):
    locale: NotRequired[str]
    branch_id: NotRequired[int]
    analytics_id: NotRequired[int]


class State(TypedDict):
    core_input: NotRequired[dict[str, Any]]
    audience_features: NotRequired[AudienceFeatures]
    outputs: NotRequired[ToneOutputs]
    title: NotRequired[str]

logger = logging.getLogger(__name__)


def _format_tone_profile(features: AudienceFeatures) -> str:
    weekday_bias = features.get("weekday_bias", "balanced")
    party_size_signal = features.get("party_size_signal", "mixed parties")
    return (
        f"{weekday_bias.title()} energy with a {party_size_signal} feel. "
        "Warm, modern, and appetite-forward."
    )


def _build_outputs(features: AudienceFeatures) -> ToneOutputs:
    primary_category = features.get("primary_category") or "signature items"
    intent_hints = features.get("intent_hints", [])
    intent_focus = intent_hints[0] if intent_hints else "everyday cravings"

    return {
        "tone_profile": _format_tone_profile(features),
        "language_guidelines": (
            "Use Bahasa with light English. Keep sentences short, friendly, "
            "and confident. Avoid jargon."
        ),
        "caption_style": (
            f"Hook + {primary_category} highlight + social proof + CTA. "
            f"Emphasize {intent_focus}."
        ),
        "hashtag_style": (
            "3-5 branded tags, 3-5 local foodie tags, and 1-2 category tags. "
            "Keep under 10 total."
        ),
        "content_dos_donts": (
            f"Do spotlight top sellers and {primary_category}. "
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


def _build_llm_prompt(features: AudienceFeatures) -> str:
    return (
        "You are a restaurant marketing strategist. "
        "Generate Instagram tone guidance and content planning outputs. "
        "Keep each value concise (1-2 sentences) except post_concepts and "
        "cta_phrases which should be short lists in a single string. "
        f"Context: weekday_bias={features.get('weekday_bias')}, "
        f"party_size_signal={features.get('party_size_signal')}, "
        f"primary_category={features.get('primary_category')}, "
        f"intent_hints={features.get('intent_hints')}, "
        f"top_items={features.get('top_items')}."
    )


async def _build_llm_outputs(features: AudienceFeatures) -> ToneOutputs:
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
    prompt = _build_llm_prompt(features)
    response = await structured_llm.ainvoke(prompt)
    logger.info("tone_agent_llm_call_success")
    data = response.model_dump()
    return cast(ToneOutputs, data)


async def run_tone_agent(state: State, runtime: Runtime[Context]) -> dict[str, Any]:
    core_input = state.get("core_input", {})
    audience_features = cast(
        AudienceFeatures, derive_audience_features_from_core_input(core_input)
    )
    if _llm_enabled():
        try:
            outputs = await _build_llm_outputs(audience_features)
        except Exception:
            logger.exception("tone_agent_llm_call_failed")
            if _llm_required():
                raise
            outputs = _build_outputs(audience_features)
    else:
        outputs = _build_outputs(audience_features)
    analytics_id = (runtime.context or {}).get("analytics_id")

    return {
        "audience_features": audience_features,
        "outputs": outputs,
        "title": (
            f"tone-agent-{analytics_id}" if analytics_id is not None else "tone-agent"
        ),
    }


graph = (
    StateGraph(State, context_schema=Context)
    .add_node("run_tone_agent", run_tone_agent)
    .add_edge("__start__", "run_tone_agent")
    .compile(name="ToneAgentGraph")
)
