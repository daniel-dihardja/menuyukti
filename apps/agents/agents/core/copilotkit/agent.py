"""LangGraph AG-UI agent that preserves Menuyukti checkpointer thread keys."""

from __future__ import annotations

from typing import Any

from ag_ui.core.types import RunAgentInput
from ag_ui_langgraph.agent import PreparedStream
from ag_ui_langgraph.types import State
from agents_app.agents.core.chat.chat_run_config import resolve_thread_id
from copilotkit import LangGraphAGUIAgent
from langchain_core.runnables import RunnableConfig


class MenuyuktiLangGraphAGUIAgent(LangGraphAGUIAgent):
    """Maps AG-UI ``thread_id`` (product ``agentThreadId``) to checkpointer keys.

    Wire events keep the product thread id from ``RunAgentInput.thread_id``.
    Graph config uses ``{userId}:agent:{agentThreadId}`` via ``resolve_thread_id``.
    """

    async def prepare_stream(
        self,
        input: RunAgentInput,
        agent_state: State,
        config: RunnableConfig,
    ) -> PreparedStream:
        conf: dict[str, Any] = dict(config.get("configurable") or {})
        user_id = conf.get("user_id")
        product_thread = (input.thread_id or "").strip()
        if isinstance(user_id, str) and user_id.strip() and product_thread:
            conf["agent_thread_id"] = product_thread
            conf["thread_id"] = resolve_thread_id(user_id.strip(), product_thread)
            config = {**config, "configurable": conf}
            graph_input = input.model_copy(
                update={"thread_id": conf["thread_id"]},
            )
            return await super().prepare_stream(graph_input, agent_state, config)
        return await super().prepare_stream(input, agent_state, config)

    async def prepare_regenerate_stream(
        self,
        input: RunAgentInput,
        message_checkpoint: Any,
        config: RunnableConfig,
    ) -> PreparedStream:
        conf: dict[str, Any] = dict(config.get("configurable") or {})
        user_id = conf.get("user_id")
        product_thread = (input.thread_id or "").strip()
        if isinstance(user_id, str) and user_id.strip() and product_thread:
            conf["agent_thread_id"] = product_thread
            conf["thread_id"] = resolve_thread_id(user_id.strip(), product_thread)
            config = {**config, "configurable": conf}
            graph_input = input.model_copy(
                update={"thread_id": conf["thread_id"]},
            )
            return await super().prepare_regenerate_stream(
                graph_input,
                message_checkpoint,
                config,
            )
        return await super().prepare_regenerate_stream(input, message_checkpoint, config)
