from fastapi.testclient import TestClient

from agent.api import app
from tests.helpers.audience_contract import load_audience_core_input_fixture
from tests.helpers.tone_contract import load_tone_core_input_fixture


client = TestClient(app)


def test_invoke_audience_agent_endpoint_returns_outputs() -> None:
    payload = {"core_input": load_audience_core_input_fixture()}

    response = client.post("/audience/invoke", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert "outputs" in body
    assert isinstance(body["outputs"], dict)
    assert "title" in body


def test_invoke_tone_agent_endpoint_returns_outputs() -> None:
    payload = {"core_input": load_tone_core_input_fixture()}

    response = client.post("/tone/invoke", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert "outputs" in body
    assert isinstance(body["outputs"], dict)
    assert "title" in body
