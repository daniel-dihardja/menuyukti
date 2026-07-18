"""Tests for Style Spec draft-from-image."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from agents_app.agents.core.style_spec.models import (
    DraftControl,
    DraftInstruction,
    StyleSpec,
    StyleSpecDraftOutput,
)
from agents_app.server import app
from fastapi.testclient import TestClient


def _sample_control(*, values: list[str] | None = None) -> DraftControl:
    vals = values or ["auto", "none"]
    return DraftControl(
        values=vals,
        default=vals[0],
        instructions=[DraftInstruction(value=v, instruction=f"Do {v}.") for v in vals],
    )


def _sample_draft() -> StyleSpecDraftOutput:
    return StyleSpecDraftOutput(
        name="Warm Oat",
        kind="template",
        baseRules=["Cream background.", "Black line art only for decorations."],
        headline=_sample_control(),
        productName=_sample_control(),
        backgroundIllustration=_sample_control(values=["template_default", "minimal", "none"]),
        defaultHeadline="auto",
        defaultProductName="auto",
        defaultBackgroundIllustration="template_default",
    )


@pytest.fixture
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


def test_draft_requires_user_header(client: TestClient) -> None:
    response = client.post(
        "/style-specs/draft-from-image",
        json={
            "image_url": "data:image/png;base64,aaa",
            "model": "openai/gpt-4o-mini",
        },
    )
    assert response.status_code == 401


def test_draft_rejects_bad_image_url(client: TestClient) -> None:
    response = client.post(
        "/style-specs/draft-from-image",
        headers={"X-Menuyukti-User-Id": "user_1"},
        json={
            "image_url": "ftp://example.com/x.png",
            "model": "openai/gpt-4o-mini",
        },
    )
    assert response.status_code == 400


def test_draft_rejects_non_vision_model(client: TestClient) -> None:
    response = client.post(
        "/style-specs/draft-from-image",
        headers={"X-Menuyukti-User-Id": "user_1"},
        json={
            "image_url": "data:image/png;base64,aaa",
            "model": "xai/grok-3",
        },
    )
    assert response.status_code == 400
    assert "allowlisted" in response.json()["detail"].lower()


def test_draft_rejects_unknown_model(client: TestClient) -> None:
    response = client.post(
        "/style-specs/draft-from-image",
        headers={"X-Menuyukti-User-Id": "user_1"},
        json={
            "image_url": "data:image/png;base64,aaa",
            "model": "openai/not-a-real-model",
        },
    )
    assert response.status_code == 400


@patch(
    "agents_app.routers.style_specs.draft_style_spec_from_image",
    new_callable=AsyncMock,
)
def test_draft_http_success(mock_draft: AsyncMock, client: TestClient) -> None:
    draft = _sample_draft()
    mock_draft.return_value = (draft.name, draft.to_style_spec())
    response = client.post(
        "/style-specs/draft-from-image",
        headers={"X-Menuyukti-User-Id": "user_1"},
        json={
            "image_url": "data:image/png;base64,aaa",
            "intent": "Warm oat template; headline optional",
            "model": "openai/gpt-4o",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Warm Oat"
    assert body["style_spec"]["schemaVersion"] == 1
    assert body["style_spec"]["kind"] == "template"
    assert "headline" in body["style_spec"]["controls"]
    mock_draft.assert_awaited_once_with(
        image_url="data:image/png;base64,aaa",
        intent="Warm oat template; headline optional",
        gateway_model_id="openai/gpt-4o",
    )


@pytest.mark.asyncio
@patch(
    "agents_app.agents.core.style_spec.draft._structured_ainvoke_function_calling",
    new_callable=AsyncMock,
)
async def test_draft_style_spec_from_image_unit(mock_structured: AsyncMock) -> None:
    from agents_app.agents.core.style_spec.draft import draft_style_spec_from_image

    draft = _sample_draft()
    mock_structured.return_value = draft
    name, spec = await draft_style_spec_from_image(
        image_url="data:image/png;base64,aaa",
        intent="optional headline",
        gateway_model_id="openai/gpt-4o-mini",
    )
    assert name == "Warm Oat"
    assert isinstance(spec, StyleSpec)
    assert spec.kind == "template"
    assert spec.controls.headline.instructions["none"] == "Do none."
    mock_structured.assert_awaited_once()
    assert mock_structured.await_args is not None
    assert mock_structured.await_args.kwargs.get("gateway_model_id") == "openai/gpt-4o-mini"


def test_draft_output_converts_to_style_spec() -> None:
    spec = _sample_draft().to_style_spec()
    assert spec.defaults.headline == "auto"
    assert spec.controls.backgroundIllustration.values == [
        "template_default",
        "minimal",
        "none",
    ]
