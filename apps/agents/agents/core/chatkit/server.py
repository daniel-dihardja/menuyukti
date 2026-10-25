"""ChatKitServer that drives LangGraph ``compile_chat_graph``."""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from typing import Any

from agents_app.agents.core.chat.chat_run_config import (
    resolve_thread_id,
    resolved_chat_gateway_model,
    runnable_config,
)
from agents_app.agents.core.chatkit.bridge import stream_langgraph_as_chatkit
from agents_app.agents.core.chatkit.context import ChatKitRequestContext
from agents_app.agents.core.chatkit.memory_store import MemoryChatKitStore
from agents_app.agents.core.chatkit.path_fix import prefer_site_packages_agents
from agents_app.agents.core.chatkit.tags import enrich_user_text_with_tags
from chatkit.store import Store
from chatkit.types import (
    Action,
    InferenceOptions,
    NoticeEvent,
    ThreadMetadata,
    ThreadStreamEvent,
    UserMessageItem,
    UserMessageTextContent,
)
from langchain_core.messages import HumanMessage

_logger = logging.getLogger(__name__)

_SERVER_CLS: type | None = None


def _utcnow() -> datetime:
    return datetime.now(UTC)


def _menuyukti_chatkit_server_cls() -> type:
    """Build the ChatKitServer subclass lazily so openai-agents wins on ``import agents``."""
    global _SERVER_CLS
    if _SERVER_CLS is not None:
        return _SERVER_CLS

    prefer_site_packages_agents()
    from chatkit.server import ChatKitServer

    class MenuyuktiChatKitServer(ChatKitServer[ChatKitRequestContext]):
        """Self-hosted ChatKit → LangGraph bridge for the advisor chat."""

        def __init__(self, store: Store[ChatKitRequestContext]) -> None:
            super().__init__(store)

        async def respond(
            self,
            thread: ThreadMetadata,
            input_user_message: UserMessageItem | None,
            context: ChatKitRequestContext,
        ) -> AsyncIterator[ThreadStreamEvent]:
            if input_user_message is None:
                return
            if context.graph is None or context.http_client is None:
                raise RuntimeError("Chat graph / HTTP client not available on ChatKit context")

            agent_thread_id = (
                str(thread.metadata.get("agent_thread_id") or context.agent_thread_id).strip()
                or context.agent_thread_id
            )
            lg_thread_id = resolve_thread_id(context.user_id, agent_thread_id)
            gateway_model = resolved_chat_gateway_model(context.chat_model)
            cfg = runnable_config(
                thread_id=lg_thread_id,
                location_id=context.location_id,
                user_id=context.user_id,
                chat_gateway_model=gateway_model,
                analytics_run_id=context.analytics_run_id,
                chat_mode=context.chat_mode,
                agent_thread_id=agent_thread_id,
                generation_model=context.generation_model,
                image_format=context.image_format,
                image_quality=context.image_quality,
            )

            text = enrich_user_text_with_tags(list(input_user_message.content))
            if not text:
                text = "(empty message)"

            meta = dict(thread.metadata or {})
            meta["agent_thread_id"] = agent_thread_id
            meta["user_id"] = context.user_id
            thread.metadata = meta
            await self.store.save_thread(thread, context)

            item_id = self.store.generate_item_id("message", thread, context)
            human = HumanMessage(content=text)

            async for event in stream_langgraph_as_chatkit(
                context.graph,
                [human],
                thread=thread,
                item_id=item_id,
                runnable_config=cfg,
                http_client=context.http_client,
                generate_id=lambda item_type: self.store.generate_item_id(
                    item_type, thread, context
                ),
            ):
                yield event

        async def action(
            self,
            thread: ThreadMetadata,
            action: Action[str, Any],
            sender: Any,
            context: ChatKitRequestContext,
        ) -> AsyncIterator[ThreadStreamEvent]:
            action_type = getattr(action, "type", "") or ""
            if action_type in {"story.generate", "story.change"}:
                payload = getattr(action, "payload", None) or {}
                verb = payload.get("action") if isinstance(payload, dict) else None
                reply = (
                    "Generate"
                    if verb == "generate" or action_type == "story.generate"
                    else "Change"
                )
                fake = UserMessageItem(
                    id=self.store.generate_item_id("message", thread, context),
                    thread_id=thread.id,
                    created_at=_utcnow(),
                    content=[UserMessageTextContent(text=reply)],
                    inference_options=InferenceOptions(),
                )
                await self.store.add_thread_item(thread.id, fake, context)
                async for event in self.respond(thread, fake, context):
                    yield event
                return
            if action_type == "schedule.export_ics":
                yield NoticeEvent(
                    level="info",
                    message=(
                        "Open the schedule card actions to export ICS from the advisor shell."
                    ),
                )
                return
            _logger.info("Unhandled ChatKit action type=%s", action_type)

    _SERVER_CLS = MenuyuktiChatKitServer
    return MenuyuktiChatKitServer


def build_chatkit_server(
    store: Store[ChatKitRequestContext] | None = None,
) -> Any:
    cls = _menuyukti_chatkit_server_cls()
    return cls(store or MemoryChatKitStore())
