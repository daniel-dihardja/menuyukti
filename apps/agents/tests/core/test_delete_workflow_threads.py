"""Tests for deleting workflow chat checkpoint threads."""

from __future__ import annotations

import pytest
from agents_app.agents.core.chat.delete_workflow_threads import (
    adelete_workflow_chat_threads,
    workflow_chat_thread_base,
)
from langgraph.checkpoint.memory import InMemorySaver


@pytest.mark.asyncio
async def test_adelete_workflow_chat_threads_memory_removes_base_and_sessions() -> None:
    cp = InMemorySaver()
    user_id = "user-1"
    workflow_id = "10"
    base = workflow_chat_thread_base(user_id=user_id, workflow_id=workflow_id)
    sess_a = f"{base}:sess:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
    sess_b = f"{base}:sess:bbbbbbbb-cccc-dddd-eeee-ffffffffffff"
    other = "user-1:wf:99:sess:cccccccc-dddd-eeee-ffff-000000000000"
    other_user = "user-2:wf:10:sess:dddddddd-eeee-ffff-0000-111111111111"

    for tid in (base, sess_a, sess_b, other, other_user):
        cp.storage[tid] = {}

    deleted = await adelete_workflow_chat_threads(
        cp,
        user_id=user_id,
        workflow_id=workflow_id,
    )

    assert deleted == sorted([base, sess_a, sess_b])
    assert base not in cp.storage
    assert sess_a not in cp.storage
    assert sess_b not in cp.storage
    assert other in cp.storage
    assert other_user in cp.storage


@pytest.mark.asyncio
async def test_adelete_workflow_chat_threads_noop_when_empty() -> None:
    cp = InMemorySaver()
    deleted = await adelete_workflow_chat_threads(
        cp,
        user_id="user-1",
        workflow_id="10",
    )
    assert deleted == []
