"""Tests for AI usage ledger client helpers."""

from __future__ import annotations

from types import SimpleNamespace

from agents_app.agents.core.ai_usage_client import usage_from_model_result


def test_usage_from_model_result_usage_metadata() -> None:
    msg = SimpleNamespace(
        usage_metadata={"input_tokens": 10, "output_tokens": 5, "total_tokens": 15}
    )
    assert usage_from_model_result(msg) == {
        "input_tokens": 10,
        "output_tokens": 5,
        "total_tokens": 15,
    }


def test_usage_from_model_result_nested_result() -> None:
    msg = SimpleNamespace(
        usage_metadata={"input_tokens": 3, "output_tokens": 2, "total_tokens": 5}
    )
    wrapper = SimpleNamespace(result=[msg])
    assert usage_from_model_result(wrapper)["total_tokens"] == 5


def test_usage_from_model_result_empty() -> None:
    assert usage_from_model_result(SimpleNamespace()) == {
        "input_tokens": 0,
        "output_tokens": 0,
        "total_tokens": 0,
    }
