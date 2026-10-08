"""Analyze a style reference image for holiday artwork via multimodal LLM."""

from __future__ import annotations

import logging

import httpx
from agents_app.agents.core.ai_usage_client import record_ai_usage_event
from agents_app.agents.core.holiday_style_analysis.models import StyleAnalysisResult
from agents_app.agents.core.holiday_style_analysis.prompts import (
    STYLE_ANALYSIS_SYSTEM,
    style_analysis_user_text,
)
from agents_app.agents.core.llm_invoke import (
    STRUCTURED_OUTPUT_FAILED,
    LLMInvokeError,
    ainvoke_with_retry,
)
from agents_app.models.llm_config import chat_llm_for_gateway_model
from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, ValidationError

_logger = logging.getLogger(__name__)


async def _structured_ainvoke_function_calling[T: BaseModel](
    output_model: type[T],
    messages: list,
    *,
    gateway_model_id: str | None = None,
    reporting_user: str | None = None,
) -> T:
    llm = chat_llm_for_gateway_model(
        gateway_model_id,
        streaming=False,
        reporting_user=reporting_user,
        reporting_tags=["feature:holiday-style-analysis"],
    )
    structured = llm.with_structured_output(output_model, method="function_calling")
    try:
        result = await ainvoke_with_retry(structured, messages)
    except ValidationError as exc:
        raise LLMInvokeError(
            f"{STRUCTURED_OUTPUT_FAILED}: {exc}",
            code=STRUCTURED_OUTPUT_FAILED,
            retryable=False,
        ) from exc
    if isinstance(result, output_model):
        return result
    if isinstance(result, BaseModel):
        return output_model.model_validate(result.model_dump())
    if isinstance(result, dict):
        return output_model.model_validate(result)
    raise LLMInvokeError(
        f"{STRUCTURED_OUTPUT_FAILED}: unexpected result type {type(result)!r}",
        code=STRUCTURED_OUTPUT_FAILED,
        retryable=False,
    )


async def analyze_holiday_style(
    *,
    image_url: str,
    operator_instructions: str | None = None,
    gateway_model_id: str | None = None,
    reporting_user: str | None = None,
    client: httpx.AsyncClient | None = None,
) -> StyleAnalysisResult:
    """
    Analyze ``image_url`` (data URL or https) into a reusable style foundation.
    """
    messages = [
        SystemMessage(content=STYLE_ANALYSIS_SYSTEM),
        HumanMessage(
            content=[
                {
                    "type": "text",
                    "text": style_analysis_user_text(
                        operator_instructions=operator_instructions
                    ),
                },
                {"type": "image_url", "image_url": {"url": image_url}},
            ]
        ),
    ]
    try:
        result = await _structured_ainvoke_function_calling(
            StyleAnalysisResult,
            messages,
            gateway_model_id=gateway_model_id,
            reporting_user=reporting_user,
        )
    except LLMInvokeError:
        raise
    except Exception as exc:
        _logger.exception("holiday_style_analysis LLM call failed")
        raise LLMInvokeError(
            f"LLM_UPSTREAM: {exc}",
            code="LLM_UPSTREAM",
            retryable=False,
        ) from exc

    if reporting_user:
        try:
            usage_client = client or httpx.AsyncClient()
            owns_client = client is None
            try:
                await record_ai_usage_event(
                    usage_client,
                    user_id=reporting_user,
                    provider="ai_gateway",
                    feature="holiday_style_analysis",
                    status="succeeded",
                    model=gateway_model_id,
                    units=1,
                    metadata={
                        "has_operator_instructions": bool(
                            operator_instructions and operator_instructions.strip()
                        ),
                    },
                )
            finally:
                if owns_client:
                    await usage_client.aclose()
        except Exception:  # noqa: BLE001
            _logger.warning("holiday_style_analysis usage record failed", exc_info=True)

    return result
