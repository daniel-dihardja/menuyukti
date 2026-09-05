"""ChatRequest / runnable config includes analytics_run_id for chart tools."""

from agents_app.agents.core.chat.chat_run_config import runnable_config as _runnable_config
from agents_app.routers.chat import ChatRequest

AGENT_THREAD_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"


def test_chat_request_accepts_analytics_run_id() -> None:
    body = ChatRequest.model_validate(
        {
            "messages": [{"role": "user", "content": "hi"}],
            "agent_thread_id": AGENT_THREAD_ID,
            "location_id": 7,
            "analytics_run_id": 42,
        }
    )
    assert body.analytics_run_id == 42


def test_runnable_config_includes_analytics_run_id() -> None:
    cfg = _runnable_config(
        thread_id=f"u1:agent:{AGENT_THREAD_ID}",
        location_id=7,
        user_id="u1",
        chat_gateway_model=None,
        analytics_run_id=42,
        agent_thread_id=AGENT_THREAD_ID,
    )
    assert cfg["configurable"]["analytics_run_id"] == 42
    assert "workflow_id" not in cfg["configurable"]


def test_runnable_config_omits_analytics_run_id_when_none() -> None:
    cfg = _runnable_config(
        thread_id=f"u1:agent:{AGENT_THREAD_ID}",
        location_id=7,
        user_id="u1",
        chat_gateway_model=None,
        analytics_run_id=None,
        agent_thread_id=AGENT_THREAD_ID,
    )
    assert "analytics_run_id" not in cfg["configurable"]


def test_chat_request_accepts_chat_mode() -> None:
    body = ChatRequest.model_validate(
        {
            "messages": [{"role": "user", "content": "hi"}],
            "agent_thread_id": AGENT_THREAD_ID,
            "chat_mode": "image_assistant",
        }
    )
    assert body.chat_mode == "image_assistant"


def test_chat_request_accepts_inventar_mode() -> None:
    body = ChatRequest.model_validate(
        {
            "messages": [{"role": "user", "content": "What should I refill?"}],
            "agent_thread_id": AGENT_THREAD_ID,
            "chat_mode": "inventar",
            "location_id": 7,
        }
    )
    assert body.chat_mode == "inventar"


def test_chat_request_accepts_legacy_story_mode_alias() -> None:
    body = ChatRequest.model_validate(
        {
            "messages": [{"role": "user", "content": "hi"}],
            "agent_thread_id": AGENT_THREAD_ID,
            "chat_mode": "story_image_assistant",
        }
    )
    assert body.chat_mode == "story_image_assistant"


def test_runnable_config_includes_chat_mode() -> None:
    cfg = _runnable_config(
        thread_id=f"u1:agent:{AGENT_THREAD_ID}",
        location_id=7,
        user_id="u1",
        chat_gateway_model=None,
        chat_mode="general",
        agent_thread_id=AGENT_THREAD_ID,
    )
    assert cfg["configurable"]["chat_mode"] == "general"


def test_runnable_config_normalizes_legacy_story_mode() -> None:
    cfg = _runnable_config(
        thread_id=f"u1:agent:{AGENT_THREAD_ID}",
        location_id=7,
        user_id="u1",
        chat_gateway_model=None,
        chat_mode="story_image_assistant",
        agent_thread_id=AGENT_THREAD_ID,
    )
    assert cfg["configurable"]["chat_mode"] == "image_assistant"
