"""ChatKit created_at normalization keeps user/assistant order chronological."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta, timezone

import anyio
from agents_app.agents.core.chatkit.context import ChatKitRequestContext
from agents_app.agents.core.chatkit.memory_store import MemoryChatKitStore
from agents_app.agents.core.chatkit.timestamps import ensure_utc, with_utc_created_at
from chatkit.types import (
    AssistantMessageContent,
    AssistantMessageItem,
    InferenceOptions,
    ThreadMetadata,
    UserMessageItem,
    UserMessageTextContent,
)


def test_ensure_utc_treats_naive_as_local() -> None:
    naive = datetime.now()
    aware = ensure_utc(naive)
    assert aware.tzinfo is not None
    assert aware == naive.astimezone(UTC)


def test_ensure_utc_preserves_aware_instant() -> None:
    offset = timezone(timedelta(hours=1))
    local = datetime(2026, 10, 29, 12, 0, 0, tzinfo=offset)
    assert ensure_utc(local) == datetime(2026, 10, 29, 11, 0, 0, tzinfo=UTC)


def test_with_utc_created_at_normalizes_user_item() -> None:
    naive = datetime.now()
    item = UserMessageItem(
        id="msg_u",
        thread_id="thr",
        created_at=naive,
        content=[UserMessageTextContent(text="hi")],
        inference_options=InferenceOptions(),
    )
    fixed = with_utc_created_at(item)
    assert fixed.created_at.tzinfo is not None
    assert fixed.created_at == naive.astimezone(UTC)


def test_naive_as_utc_misorders_relative_to_aware_utc() -> None:
    """Document the reload bug: labeling local wall clock as UTC shifts users later."""
    offset = timezone(timedelta(hours=1))
    # Same real instant: 12:00+01:00 == 11:00Z
    user_local_naive = datetime(2026, 10, 29, 12, 0, 0)  # ChatKit-style naive local
    assistant_utc = datetime(2026, 10, 29, 11, 0, 1, tzinfo=UTC)

    # Bug path used by TIMESTAMPTZ when naive is assumed UTC:
    buggy_user = user_local_naive.replace(tzinfo=UTC)
    assert buggy_user > assistant_utc

    # Fixed path: treat naive as local (here: force +01:00 then convert).
    fixed_user = user_local_naive.replace(tzinfo=offset).astimezone(UTC)
    assert fixed_user < assistant_utc


def test_memory_store_orders_naive_user_before_utc_assistant() -> None:
    """ChatKit SDK naive user timestamps must sort before our UTC assistant items."""
    store = MemoryChatKitStore()
    ctx = ChatKitRequestContext(
        user_id="user-1",
        agent_thread_id="11111111-1111-1111-1111-111111111111",
    )
    thread_id = ctx.agent_thread_id

    async def _run() -> None:
        await store.save_thread(
            ThreadMetadata(id=thread_id, created_at=datetime.now(UTC)),
            ctx,
        )

        # Same pattern as ChatKit server (naive now) then our bridge (aware UTC).
        user_naive = datetime.now()
        assistant_utc = datetime.now(UTC) + timedelta(milliseconds=5)

        await store.add_thread_item(
            thread_id,
            UserMessageItem(
                id="msg_u1",
                thread_id=thread_id,
                created_at=user_naive,
                content=[UserMessageTextContent(text="hello")],
                inference_options=InferenceOptions(),
            ),
            ctx,
        )
        await store.add_thread_item(
            thread_id,
            AssistantMessageItem(
                id="msg_a1",
                thread_id=thread_id,
                created_at=assistant_utc,
                content=[AssistantMessageContent(text="hi there")],
            ),
            ctx,
        )

        page = await store.load_thread_items(thread_id, None, 10, "asc", ctx)
        assert [item.id for item in page.data] == ["msg_u1", "msg_a1"]

    anyio.run(_run)
