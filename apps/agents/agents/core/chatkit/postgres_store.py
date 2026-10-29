"""Postgres-backed ChatKit Store (JSON blobs; same DB URL as LangGraph checkpoints)."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Any

from agents_app.agents.core.chatkit.context import ChatKitRequestContext
from agents_app.agents.core.chatkit.timestamps import with_utc_created_at
from chatkit.store import NotFoundError, Store
from chatkit.types import Attachment, Page, ThreadItem, ThreadMetadata
from psycopg import AsyncConnection
from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool
from pydantic import TypeAdapter

_THREAD_ITEM_ADAPTER: TypeAdapter[ThreadItem] = TypeAdapter(ThreadItem)
_ATTACHMENT_ADAPTER: TypeAdapter[Attachment] = TypeAdapter(Attachment)


# One statement per execute — psycopg rejects multi-command prepared statements.
_SCHEMA_STATEMENTS = (
    """
    CREATE TABLE IF NOT EXISTS chatkit_threads (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    """
    CREATE INDEX IF NOT EXISTS chatkit_threads_user_id_idx
      ON chatkit_threads (user_id)
    """,
    """
    CREATE TABLE IF NOT EXISTS chatkit_items (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL REFERENCES chatkit_threads(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    """
    CREATE INDEX IF NOT EXISTS chatkit_items_thread_id_idx
      ON chatkit_items (thread_id, created_at)
    """,
    """
    CREATE TABLE IF NOT EXISTS chatkit_attachments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
)


class PostgresChatKitStore(Store[ChatKitRequestContext]):
    """Durable ChatKit store using JSONB rows."""

    def __init__(self, pool: AsyncConnectionPool[AsyncConnection[Any]]) -> None:
        self._pool = pool

    def generate_thread_id(self, context: ChatKitRequestContext) -> str:
        if context.agent_thread_id.strip():
            return context.agent_thread_id.strip()
        return super().generate_thread_id(context)

    async def setup(self) -> None:
        async with self._pool.connection() as conn:
            for statement in _SCHEMA_STATEMENTS:
                await conn.execute(statement)

    async def load_thread(self, thread_id: str, context: ChatKitRequestContext) -> ThreadMetadata:
        async with self._pool.connection() as conn:
            row = await conn.execute(
                "SELECT payload FROM chatkit_threads WHERE id = %s AND user_id = %s",
                (thread_id, context.user_id),
            )
            data = await row.fetchone()
            if data is not None:
                return ThreadMetadata.model_validate(data["payload"])

        # Advisor mounts ChatKit with initialThread = agent UUID before any turn.
        # Materialize an empty ChatKit thread so threads.get_by_id succeeds.
        if thread_id.strip() == context.agent_thread_id.strip():
            created = ThreadMetadata(
                id=thread_id,
                created_at=datetime.now(UTC),
                metadata={
                    "agent_thread_id": context.agent_thread_id,
                    "user_id": context.user_id,
                },
            )
            await self.save_thread(created, context)
            return created
        raise NotFoundError(f"Thread {thread_id} not found")

    async def save_thread(self, thread: ThreadMetadata, context: ChatKitRequestContext) -> None:
        meta = dict(thread.metadata or {})
        meta.setdefault("agent_thread_id", context.agent_thread_id)
        meta.setdefault("user_id", context.user_id)
        saved = thread.model_copy(update={"metadata": meta})
        payload = saved.model_dump(mode="json")
        async with self._pool.connection() as conn:
            await conn.execute(
                """
                INSERT INTO chatkit_threads (id, user_id, payload, created_at)
                VALUES (%s, %s, %s::jsonb, %s)
                ON CONFLICT (id) DO UPDATE
                SET payload = EXCLUDED.payload, user_id = EXCLUDED.user_id
                """,
                (saved.id, context.user_id, json.dumps(payload), saved.created_at),
            )

    async def load_threads(
        self,
        limit: int,
        after: str | None,
        order: str,
        context: ChatKitRequestContext,
    ) -> Page[ThreadMetadata]:
        order_sql = "ASC" if order == "asc" else "DESC"
        async with self._pool.connection() as conn:
            if after:
                cur = await conn.execute(
                    "SELECT created_at FROM chatkit_threads WHERE id = %s AND user_id = %s",
                    (after, context.user_id),
                )
                after_row = await cur.fetchone()
                if after_row is None:
                    return Page(data=[], has_more=False, after=None)
                cmp = ">" if order == "asc" else "<"
                rows = await (
                    await conn.execute(
                        f"""
                        SELECT payload FROM chatkit_threads
                        WHERE user_id = %s AND created_at {cmp} %s
                        ORDER BY created_at {order_sql}
                        LIMIT %s
                        """,
                        (context.user_id, after_row["created_at"], limit + 1),
                    )
                ).fetchall()
            else:
                rows = await (
                    await conn.execute(
                        f"""
                        SELECT payload FROM chatkit_threads
                        WHERE user_id = %s
                        ORDER BY created_at {order_sql}
                        LIMIT %s
                        """,
                        (context.user_id, limit + 1),
                    )
                ).fetchall()
        threads = [ThreadMetadata.model_validate(r["payload"]) for r in rows[:limit]]
        has_more = len(rows) > limit
        return Page(
            data=threads,
            has_more=has_more,
            after=threads[-1].id if threads and has_more else None,
        )

    async def load_thread_items(
        self,
        thread_id: str,
        after: str | None,
        limit: int,
        order: str,
        context: ChatKitRequestContext,
    ) -> Page[ThreadItem]:
        # Ensure ownership
        await self.load_thread(thread_id, context)
        # Load the full thread then sort in Python after normalizing timestamps.
        # ChatKit user items use naive local ``datetime.now()`` while assistant
        # items use aware UTC; SQL ORDER BY on the raw column groups by role in
        # non-UTC locales. Threads are small (ChatKit pages at 20).
        async with self._pool.connection() as conn:
            rows = await (
                await conn.execute(
                    """
                    SELECT payload FROM chatkit_items
                    WHERE thread_id = %s AND user_id = %s
                    """,
                    (thread_id, context.user_id),
                )
            ).fetchall()
        items = [
            with_utc_created_at(_THREAD_ITEM_ADAPTER.validate_python(r["payload"])) for r in rows
        ]
        reverse = order != "asc"
        items.sort(key=lambda i: (i.created_at, i.id), reverse=reverse)
        start = 0
        if after:
            for i, item in enumerate(items):
                if item.id == after:
                    start = i + 1
                    break
        slice_ = items[start : start + limit]
        has_more = start + limit < len(items)
        return Page(
            data=slice_,
            has_more=has_more,
            after=slice_[-1].id if slice_ and has_more else None,
        )

    async def add_thread_item(
        self, thread_id: str, item: ThreadItem, context: ChatKitRequestContext
    ) -> None:
        await self.save_item(thread_id, item, context)

    async def save_item(
        self, thread_id: str, item: ThreadItem, context: ChatKitRequestContext
    ) -> None:
        # Ensure thread row exists for FK (also covers non-agent-thread ids).
        try:
            await self.load_thread(thread_id, context)
        except NotFoundError:
            await self.save_thread(
                ThreadMetadata(id=thread_id, created_at=datetime.now(UTC)),
                context,
            )
        saved = with_utc_created_at(item)
        payload = _THREAD_ITEM_ADAPTER.dump_python(saved, mode="json")
        async with self._pool.connection() as conn:
            await conn.execute(
                """
                INSERT INTO chatkit_items (id, thread_id, user_id, payload, created_at)
                VALUES (%s, %s, %s, %s::jsonb, %s)
                ON CONFLICT (id) DO UPDATE
                SET payload = EXCLUDED.payload, created_at = EXCLUDED.created_at
                """,
                (saved.id, thread_id, context.user_id, json.dumps(payload), saved.created_at),
            )

    async def load_item(
        self, thread_id: str, item_id: str, context: ChatKitRequestContext
    ) -> ThreadItem:
        async with self._pool.connection() as conn:
            row = await (
                await conn.execute(
                    """
                    SELECT payload FROM chatkit_items
                    WHERE id = %s AND thread_id = %s AND user_id = %s
                    """,
                    (item_id, thread_id, context.user_id),
                )
            ).fetchone()
        if row is None:
            raise NotFoundError(f"Item {item_id} not found")
        return with_utc_created_at(_THREAD_ITEM_ADAPTER.validate_python(row["payload"]))

    async def delete_thread(self, thread_id: str, context: ChatKitRequestContext) -> None:
        async with self._pool.connection() as conn:
            await conn.execute(
                "DELETE FROM chatkit_threads WHERE id = %s AND user_id = %s",
                (thread_id, context.user_id),
            )

    async def delete_thread_item(
        self, thread_id: str, item_id: str, context: ChatKitRequestContext
    ) -> None:
        async with self._pool.connection() as conn:
            await conn.execute(
                """
                DELETE FROM chatkit_items
                WHERE id = %s AND thread_id = %s AND user_id = %s
                """,
                (item_id, thread_id, context.user_id),
            )

    async def save_attachment(self, attachment: Attachment, context: ChatKitRequestContext) -> None:
        payload = _ATTACHMENT_ADAPTER.dump_python(attachment, mode="json")
        async with self._pool.connection() as conn:
            await conn.execute(
                """
                INSERT INTO chatkit_attachments (id, user_id, payload)
                VALUES (%s, %s, %s::jsonb)
                ON CONFLICT (id) DO UPDATE
                SET payload = EXCLUDED.payload, user_id = EXCLUDED.user_id
                """,
                (attachment.id, context.user_id, json.dumps(payload)),
            )

    async def load_attachment(
        self, attachment_id: str, context: ChatKitRequestContext
    ) -> Attachment:
        async with self._pool.connection() as conn:
            row = await (
                await conn.execute(
                    "SELECT payload FROM chatkit_attachments WHERE id = %s AND user_id = %s",
                    (attachment_id, context.user_id),
                )
            ).fetchone()
        if row is None:
            raise NotFoundError(f"Attachment {attachment_id} not found")
        return _ATTACHMENT_ADAPTER.validate_python(row["payload"])

    async def delete_attachment(self, attachment_id: str, context: ChatKitRequestContext) -> None:
        async with self._pool.connection() as conn:
            await conn.execute(
                "DELETE FROM chatkit_attachments WHERE id = %s AND user_id = %s",
                (attachment_id, context.user_id),
            )


async def open_chatkit_postgres_store(
    db_url: str,
) -> tuple[PostgresChatKitStore, AsyncConnectionPool[AsyncConnection[Any]]]:
    pool: AsyncConnectionPool[AsyncConnection[Any]] = AsyncConnectionPool(
        conninfo=db_url,
        min_size=1,
        max_size=5,
        max_idle=300.0,
        max_lifetime=3600.0,
        timeout=30.0,
        kwargs={
            "autocommit": True,
            "prepare_threshold": 0,
            "row_factory": dict_row,
        },
        open=False,
        check=AsyncConnectionPool.check_connection,
    )
    await pool.open()
    store = PostgresChatKitStore(pool)
    await store.setup()
    return store, pool
