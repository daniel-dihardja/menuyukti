"""Tests for skill loader, prefetch, and milestone prepare route."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest
from agents_app.agents.domain.skill_runner.env import (
    RunEnv,
    render_human_message,
    render_inputs,
    render_template,
)
from agents_app.agents.domain.skill_runner.loader import load_skill
from agents_app.agents.domain.skill_runner.prefetch import prefetch_data
from agents_app.agents.domain.skill_runner.runner import run_skill_events
from agents_app.server import app
from fastapi.testclient import TestClient


@pytest.fixture
def http_client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def skill_path() -> Path:
    return (
        Path(__file__).resolve().parent.parent.parent / "skills" / "location_profile" / "SKILL.md"
    )


def test_load_location_profile_skill(skill_path: Path) -> None:
    cfg = load_skill(skill_path)
    assert cfg.name == "location-profile"
    assert "location profile" in cfg.description.lower()
    assert cfg.menuyukti.version == 1
    assert cfg.menuyukti.human_message_template.strip()
    assert "context.operating_profile" in cfg.menuyukti.human_message_template
    assert len(cfg.menuyukti.data_requirements) == 2
    assert "restaurant marketing analyst" in cfg.body.lower()


def test_render_template() -> None:
    env = RunEnv(milestone_id="m-1", location_id=42, user_id="u1")
    assert render_template("{{ env.location_id }}", env) == "42"
    assert render_template("{{ env.milestone_id }}", env) == "m-1"


def test_render_inputs_coerces_location_id() -> None:
    env = RunEnv(milestone_id="m-1", location_id=99, user_id="u")
    out = render_inputs({"location_id": "{{ env.location_id }}"}, env)
    assert out["location_id"] == 99


def test_render_human_message() -> None:
    tpl = (
        "Metrics:\n{{ context.operating_profile | tojson(indent=2) }}\n"
        "{% if context.location %}\nLoc:\n{{ context.location | tojson(indent=2) }}\n{% endif %}\nDone."
    )
    ctx = {
        "operating_profile": {"totalOrders": 1},
        "location": {"name": "Cafe"},
    }
    out = render_human_message(tpl, ctx)
    assert '"totalOrders": 1' in out
    assert '"name": "Cafe"' in out

    ctx_no_loc = {"operating_profile": {"a": 1}, "location": None}
    out2 = render_human_message(tpl, ctx_no_loc)
    assert '"a": 1' in out2
    assert "Loc:" not in out2


@pytest.mark.asyncio
async def test_prefetch_data_mock_handlers(skill_path: Path) -> None:
    cfg = load_skill(skill_path)
    env = RunEnv(milestone_id="ms1", location_id=1, user_id="user-1")

    async def fake_loc(inputs: dict, *, client: httpx.AsyncClient, user_id: str):
        return {"id": "1", "name": "Test"}

    async def fake_op(inputs: dict, *, client: httpx.AsyncClient, user_id: str):
        return {"totalOrders": 10}

    with patch.dict(
        "agents_app.agents.domain.skill_runner.handlers.PREFETCH_HANDLERS",
        {
            "platform.location": fake_loc,
            "analytics.latest_operating_profile": fake_op,
        },
        clear=False,
    ):
        async with httpx.AsyncClient() as client:
            ctx = await prefetch_data(cfg, env, client=client)
    assert ctx["location"]["name"] == "Test"
    assert ctx["operating_profile"]["totalOrders"] == 10


@pytest.mark.asyncio
async def test_run_skill_events_streams_steps(skill_path: Path) -> None:
    env_user = "u1"
    chunks: list[dict] = []

    mock_llm = MagicMock()

    async def fake_astream(_messages):
        yield MagicMock(content="Hello ")
        yield MagicMock(content="world")

    mock_llm.astream = fake_astream

    async def mock_prefetch_with_steps(*_a: object, **_k: object):
        yield "fetch_location", "location", {"name": "X"}
        yield "fetch_operating_profile", "operating_profile", {"totalOrders": 1}

    with (
        patch(
            "agents_app.agents.domain.skill_runner.runner.prefetch_data_with_steps",
            mock_prefetch_with_steps,
        ),
        patch("agents_app.agents.domain.skill_runner.runner.get_llm", return_value=mock_llm),
        patch(
            "agents_app.agents.domain.skill_runner.runner.persist_milestonedata_markdown",
            new=AsyncMock(return_value="node-uuid-1"),
        ) as mock_persist,
    ):
        async with httpx.AsyncClient() as client:
            async for payload in run_skill_events(
                skill_path,
                "mile-1",
                1,
                env_user,
                client=client,
            ):
                chunks.append(payload)

    steps = [p["step"] for p in chunks if "step" in p]
    assert "fetch_location" in steps
    assert "fetch_operating_profile" in steps
    assert "generate" in steps
    assert "persist" in steps
    done = [p for p in chunks if p.get("done")]
    assert len(done) == 1
    assert done[0]["dataPreview"] == "Hello world"
    assert done[0]["milestonedataId"] == "node-uuid-1"
    mock_persist.assert_awaited_once()


@patch("agents_app.routers.milestone_prepare.run_skill_events")
def test_milestone_prepare_route_streams(mock_run: MagicMock, http_client: TestClient) -> None:
    def fake_run(*_a: object, **_k: object):
        async def _gen():
            yield {"step": "fetch_location"}
            yield {"done": True, "dataPreview": "ok", "milestonedataId": "nid"}

        return _gen()

    mock_run.side_effect = fake_run

    with http_client.stream(
        "POST",
        "/milestones/ms1/prepare",
        json={"location_id": 1},
        headers={"X-Menuyukti-User-Id": "user-1"},
    ) as response:
        assert response.status_code == 200
        text = "".join(response.iter_text())
    assert "fetch_location" in text
    assert "dataPreview" in text
    assert "ok" in text


def test_milestone_prepare_missing_user(http_client: TestClient) -> None:
    response = http_client.post("/milestones/ms1/prepare", json={"location_id": 1})
    assert response.status_code == 401
