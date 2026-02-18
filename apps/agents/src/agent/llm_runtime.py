from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass
from typing import Any, Protocol

from langchain_openai import ChatOpenAI

from agent.runtime_config import AgentRuntimeConfig


class LlmProvider(Protocol):
    def invoke_json(
        self,
        *,
        model_id: str,
        system_prompt: str,
        user_prompt: str,
        timeout_seconds: float,
    ) -> dict[str, Any]: ...


class MockLlmProvider:
    def invoke_json(
        self,
        *,
        model_id: str,
        system_prompt: str,
        user_prompt: str,
        timeout_seconds: float,
    ) -> dict[str, Any]:
        behavior = (os.getenv("AGENTS_LLM_MOCK_BEHAVIOR") or "").strip().lower()
        if behavior == "timeout":
            raise TimeoutError("simulated timeout")
        if behavior == "error":
            raise RuntimeError("simulated provider error")

        override_raw = os.getenv("AGENTS_LLM_MOCK_RESPONSE")
        if override_raw:
            parsed = json.loads(override_raw)
            if isinstance(parsed, dict):
                return parsed

        return {
            "headline": "LLM mock synthesis generated.",
            "summary": user_prompt[:180],
            "confidence_note": "mock_provider_default",
        }


class OpenAiLlmProvider:
    def invoke_json(
        self,
        *,
        model_id: str,
        system_prompt: str,
        user_prompt: str,
        timeout_seconds: float,
    ) -> dict[str, Any]:
        llm = ChatOpenAI(
            model=model_id,
            timeout=timeout_seconds,
            temperature=0,
        )
        response = llm.invoke(
            [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
        )

        text = response.content
        if isinstance(text, list):
            text = "".join(str(chunk) for chunk in text)
        if not isinstance(text, str):
            return {"raw": text}

        try:
            parsed = json.loads(text)
        except json.JSONDecodeError:
            return {"raw_text": text}
        if not isinstance(parsed, dict):
            return {"raw": parsed}
        return parsed


@dataclass(frozen=True)
class LlmExecutionResult:
    status: str
    provider: str
    mode: str
    prompt_version: str
    model_id: str
    latency_ms: int
    output: dict[str, Any] | None
    error_code: str | None = None
    error_message: str | None = None
    attempts: int = 0

    def to_public_dict(self) -> dict[str, Any]:
        return {
            "status": self.status,
            "provider": self.provider,
            "mode": self.mode,
            "prompt_version": self.prompt_version,
            "model_id": self.model_id,
            "latency_ms": self.latency_ms,
            "attempts": self.attempts,
            "error_code": self.error_code,
            "output": self.output,
        }


def _env_flag(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def is_llm_enabled() -> bool:
    return _env_flag("AGENTS_LLM_ENABLED", True)


def get_llm_provider_name() -> str:
    return (os.getenv("AGENTS_LLM_PROVIDER") or "mock").strip().lower()


def _build_provider(provider_name: str) -> LlmProvider:
    if provider_name == "openai":
        return OpenAiLlmProvider()
    return MockLlmProvider()


def execute_llm_step(
    *,
    agent_id: str,
    runtime: AgentRuntimeConfig,
    system_prompt: str,
    user_prompt: str,
    required_output_keys: tuple[str, ...] = (),
) -> LlmExecutionResult:
    provider_name = get_llm_provider_name()
    if not is_llm_enabled():
        return LlmExecutionResult(
            status="disabled",
            provider=provider_name,
            mode="deterministic",
            prompt_version=runtime.prompt_version,
            model_id=runtime.model_id,
            latency_ms=0,
            output=None,
            attempts=0,
        )

    provider = _build_provider(provider_name)
    attempts = 0
    started = time.perf_counter()
    last_error_code: str | None = None
    last_error_message: str | None = None

    for _ in range(runtime.max_retries + 1):
        attempts += 1
        try:
            output = provider.invoke_json(
                model_id=runtime.model_id,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                timeout_seconds=runtime.timeout_seconds,
            )
            if required_output_keys:
                missing = [key for key in required_output_keys if key not in output]
                if missing:
                    raise ValueError(
                        f"missing required llm output keys for {agent_id}: {', '.join(missing)}",
                    )
            elapsed_ms = int((time.perf_counter() - started) * 1000)
            return LlmExecutionResult(
                status="used",
                provider=provider_name,
                mode="live" if provider_name == "openai" else "mock",
                prompt_version=runtime.prompt_version,
                model_id=runtime.model_id,
                latency_ms=elapsed_ms,
                output=output,
                attempts=attempts,
            )
        except TimeoutError as error:
            last_error_code = "LLM_TIMEOUT"
            last_error_message = str(error)
        except ValueError as error:
            last_error_code = "LLM_SCHEMA_INVALID"
            last_error_message = str(error)
        except Exception as error:  # noqa: BLE001
            last_error_code = "LLM_PROVIDER_ERROR"
            last_error_message = str(error)

    elapsed_ms = int((time.perf_counter() - started) * 1000)
    return LlmExecutionResult(
        status="fallback",
        provider=provider_name,
        mode="deterministic",
        prompt_version=runtime.prompt_version,
        model_id=runtime.model_id,
        latency_ms=elapsed_ms,
        output=None,
        error_code=last_error_code,
        error_message=last_error_message,
        attempts=attempts,
    )


def build_run_metadata(*, run_id: str, runtime: AgentRuntimeConfig, llm: LlmExecutionResult) -> dict[str, Any]:
    return {
        "run_id": run_id,
        # Keep existing key for backwards compatibility with web persistence paths.
        "model": runtime.model_id,
        "model_id": runtime.model_id,
        "prompt_version": runtime.prompt_version,
        "llm_provider": llm.provider,
        "llm_mode": llm.mode,
        "llm_status": llm.status,
        "llm_latency_ms": llm.latency_ms,
    }


def build_skipped_llm_result(*, runtime: AgentRuntimeConfig, reason_code: str) -> LlmExecutionResult:
    provider_name = get_llm_provider_name()
    return LlmExecutionResult(
        status="skipped",
        provider=provider_name,
        mode="deterministic",
        prompt_version=runtime.prompt_version,
        model_id=runtime.model_id,
        latency_ms=0,
        output=None,
        error_code=reason_code,
        attempts=0,
    )
