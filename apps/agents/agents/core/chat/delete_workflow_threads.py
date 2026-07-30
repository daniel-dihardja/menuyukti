"""Delete LangGraph chat checkpoints for a workflow (all sessions)."""

from __future__ import annotations

from typing import Any


def workflow_chat_thread_base(*, user_id: str, workflow_id: str) -> str:
    return f"{user_id}:wf:{workflow_id}"


def _is_workflow_thread(thread_id: str, *, base: str, sess_prefix: str) -> bool:
    return thread_id == base or thread_id.startswith(sess_prefix)


async def adelete_workflow_chat_threads(
    checkpointer: Any,
    *,
    user_id: str,
    workflow_id: str,
) -> list[str]:
    """Remove all checkpoint rows for ``{user_id}:wf:{workflow_id}`` and ``…:sess:*``.

    Supports ``InMemorySaver`` (via ``storage``) and ``AsyncPostgresSaver``
    (bulk SQL matching LangGraph's ``adelete_thread`` tables).
    """
    base = workflow_chat_thread_base(user_id=user_id, workflow_id=workflow_id)
    sess_prefix = f"{base}:sess:"

    storage = getattr(checkpointer, "storage", None)
    if storage is not None:
        deleted: list[str] = []
        for thread_id in list(storage.keys()):
            tid = str(thread_id)
            if _is_workflow_thread(tid, base=base, sess_prefix=sess_prefix):
                await checkpointer.adelete_thread(tid)
                deleted.append(tid)
        return sorted(deleted)

    cursor_factory = getattr(checkpointer, "_cursor", None)
    if cursor_factory is None:
        # Unknown checkpointer: best-effort exact + documented session pattern only.
        await checkpointer.adelete_thread(base)
        return [base]

    like = f"{sess_prefix}%"
    deleted_ids: list[str] = []
    async with checkpointer._cursor(pipeline=True) as cur:
        await cur.execute(
            """
            SELECT DISTINCT thread_id FROM (
              SELECT thread_id FROM checkpoints
                WHERE thread_id = %s OR thread_id LIKE %s
              UNION
              SELECT thread_id FROM checkpoint_blobs
                WHERE thread_id = %s OR thread_id LIKE %s
              UNION
              SELECT thread_id FROM checkpoint_writes
                WHERE thread_id = %s OR thread_id LIKE %s
            ) AS t
            """,
            (base, like, base, like, base, like),
        )
        rows = await cur.fetchall()
        for row in rows:
            tid = row["thread_id"] if isinstance(row, dict) else row[0]
            deleted_ids.append(str(tid))

        for table in ("checkpoints", "checkpoint_blobs", "checkpoint_writes"):
            await cur.execute(
                f"DELETE FROM {table} WHERE thread_id = %s OR thread_id LIKE %s",
                (base, like),
            )

    return sorted(deleted_ids)


__all__ = [
    "adelete_workflow_chat_threads",
    "workflow_chat_thread_base",
]
