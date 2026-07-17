"""Draft a Style Spec from a reference image via multimodal structured LLM."""

from __future__ import annotations

import logging

from agents_app.agents.core.llm_invoke import (
    STRUCTURED_OUTPUT_FAILED,
    LLMInvokeError,
    ainvoke_with_retry,
)
from agents_app.agents.core.style_spec.models import StyleSpec, StyleSpecDraftOutput
from agents_app.agents.core.style_spec.prompts import (
    STYLE_SPEC_DRAFT_SYSTEM,
    style_spec_draft_user_text,
)
from agents_app.models.llm_config import get_llm_structured
from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, ValidationError

_logger = logging.getLogger(__name__)


async def _structured_ainvoke_function_calling[T: BaseModel](
    output_model: type[T],
    messages: list,
) -> T:
    """
    Use function_calling structured output — free-form dict schemas are rejected by
    OpenAI's strict json_schema method (see langchain-openai warning).
    """
    llm = get_llm_structured()
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


async def draft_style_spec_from_image(
    *,
    image_url: str,
    intent: str | None = None,
) -> tuple[str, StyleSpec]:
    """
    Analyze ``image_url`` (data URL or https) and return ``(suggested_name, StyleSpec)``.
    """
    messages = [
        SystemMessage(content=STYLE_SPEC_DRAFT_SYSTEM),
        HumanMessage(
            content=[
                {"type": "text", "text": style_spec_draft_user_text(intent=intent)},
                {"type": "image_url", "image_url": {"url": image_url}},
            ]
        ),
    ]
    try:
        draft = await _structured_ainvoke_function_calling(StyleSpecDraftOutput, messages)
    except LLMInvokeError:
        raise
    except Exception as exc:
        _logger.exception("style_spec draft LLM call failed")
        raise LLMInvokeError(
            f"LLM_UPSTREAM: {exc}",
            code="LLM_UPSTREAM",
            retryable=False,
        ) from exc

    name = draft.name.strip() or "Untitled style"
    spec = draft.to_style_spec()
    return name[:128], spec
