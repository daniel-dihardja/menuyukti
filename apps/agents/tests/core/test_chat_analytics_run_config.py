"""ChatRequest / runnable config includes analytics_run_id for chart tools."""

from agents_app.routers.chat import ChatRequest, _runnable_config


def test_chat_request_accepts_analytics_run_id() -> None:
    body = ChatRequest.model_validate(
        {
            "messages": [{"role": "user", "content": "hi"}],
            "workflow_id": "100",
            "location_id": 7,
            "analytics_run_id": 42,
        }
    )
    assert body.analytics_run_id == 42


def test_runnable_config_includes_analytics_run_id() -> None:
    cfg = _runnable_config(
        thread_id="u1:wf:100",
        workflow_id="100",
        location_id=7,
        user_id="u1",
        chat_gateway_model=None,
        analytics_run_id=42,
    )
    assert cfg["configurable"]["analytics_run_id"] == 42


def test_runnable_config_omits_analytics_run_id_when_none() -> None:
    cfg = _runnable_config(
        thread_id="u1:wf:100",
        workflow_id="100",
        location_id=7,
        user_id="u1",
        chat_gateway_model=None,
        analytics_run_id=None,
    )
    assert "analytics_run_id" not in cfg["configurable"]


def test_chat_request_accepts_chat_mode() -> None:
    body = ChatRequest.model_validate(
        {
            "messages": [{"role": "user", "content": "hi"}],
            "workflow_id": "100",
            "chat_mode": "story_image_assistant",
        }
    )
    assert body.chat_mode == "story_image_assistant"


def test_runnable_config_includes_chat_mode() -> None:
    cfg = _runnable_config(
        thread_id="u1:wf:100",
        workflow_id="100",
        location_id=7,
        user_id="u1",
        chat_gateway_model=None,
        chat_mode="general",
    )
    assert cfg["configurable"]["chat_mode"] == "general"
