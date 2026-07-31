"""Per-request GraphQL context: session lifecycle, auth memoization, order-fact cache."""

from __future__ import annotations

import logging
from collections.abc import Iterator
from contextlib import contextmanager
from typing import Any

import strawberry
from sqlalchemy.orm import Session
from strawberry.extensions import SchemaExtension

from graphql.data_sources import OrderFact, SessionLocal

logger = logging.getLogger(__name__)

_SESSION_KEY = "_request_session"
_OWNER_CACHE_KEY = "_location_owner_cache"
_RUN_ACCESS_CACHE_KEY = "_analytics_run_access_cache"
_ORDER_FACTS_CACHE_KEY = "_order_facts_cache"
_ORDER_FACTS_LOAD_COUNT_KEY = "_order_facts_load_count"
_MANUAL_BRIEF_CACHE_KEY = "_manual_brief_cache"


def init_request_context(ctx: dict[str, Any]) -> dict[str, Any]:
    """Attach per-request caches to the Strawberry context dict."""
    ctx.setdefault(_OWNER_CACHE_KEY, {})
    ctx.setdefault(_RUN_ACCESS_CACHE_KEY, {})
    ctx.setdefault(_ORDER_FACTS_CACHE_KEY, {})
    ctx.setdefault(_ORDER_FACTS_LOAD_COUNT_KEY, 0)
    ctx.setdefault(_MANUAL_BRIEF_CACHE_KEY, {})
    return ctx


def _context_dict(info: strawberry.Info) -> dict[str, Any] | None:
    ctx = info.context
    return ctx if isinstance(ctx, dict) else None


def get_request_session(info: strawberry.Info, *, create: bool = True) -> Session | None:
    """Return the request-scoped session, creating one when ``create`` is true."""
    ctx = _context_dict(info)
    if ctx is None:
        return SessionLocal() if create else None
    session = ctx.get(_SESSION_KEY)
    if session is not None:
        return session
    if not create:
        return None
    session = SessionLocal()
    ctx[_SESSION_KEY] = session
    return session


@contextmanager
def request_session_scope(info: strawberry.Info) -> Iterator[Session]:
    """Yield the request-scoped session, creating one when needed.

    The session stays in context until ``RequestSessionExtension`` closes it at
    the end of the GraphQL operation so nested field resolvers can reuse it.
    """
    ctx = _context_dict(info)
    if ctx is not None and _SESSION_KEY in ctx:
        yield ctx[_SESSION_KEY]
        return
    session = SessionLocal()
    created_for_request = ctx is not None
    if created_for_request:
        ctx[_SESSION_KEY] = session
    try:
        yield session
    finally:
        if not created_for_request:
            session.close()


def close_request_session(ctx: dict[str, Any]) -> None:
    session = ctx.pop(_SESSION_KEY, None)
    if session is not None:
        try:
            session.close()
        except Exception:
            logger.exception("Failed to close request session")


def get_location_owner_cache(info: strawberry.Info) -> dict[tuple[int, str], bool]:
    ctx = _context_dict(info)
    if ctx is None:
        return {}
    return ctx.setdefault(_OWNER_CACHE_KEY, {})


def get_run_access_cache(info: strawberry.Info) -> dict[int, Any]:
    """Maps analytics_run_id -> AnalyticsRun or None (denied/missing)."""
    ctx = _context_dict(info)
    if ctx is None:
        return {}
    return ctx.setdefault(_RUN_ACCESS_CACHE_KEY, {})


def get_order_facts_cache(info: strawberry.Info) -> dict[int, list[OrderFact]]:
    ctx = _context_dict(info)
    if ctx is None:
        return {}
    return ctx.setdefault(_ORDER_FACTS_CACHE_KEY, {})


def get_manual_brief_cache(info: strawberry.Info) -> dict[int, Any]:
    """Maps location_id -> LocationManualBriefInputType (or empty-profile stand-in)."""
    ctx = _context_dict(info)
    if ctx is None:
        return {}
    return ctx.setdefault(_MANUAL_BRIEF_CACHE_KEY, {})


def record_order_facts_load(info: strawberry.Info | None) -> None:
    if info is None:
        return
    ctx = _context_dict(info)
    if ctx is None:
        return
    ctx[_ORDER_FACTS_LOAD_COUNT_KEY] = int(ctx.get(_ORDER_FACTS_LOAD_COUNT_KEY, 0)) + 1
    logger.debug(
        "order_facts DB load #%s for request",
        ctx[_ORDER_FACTS_LOAD_COUNT_KEY],
    )


class RequestSessionExtension(SchemaExtension):
    """Close the request-scoped SQLAlchemy session after each GraphQL operation."""

    def on_operation(self) -> Iterator[None]:
        yield
        ctx = self.execution_context.context
        if isinstance(ctx, dict):
            loads = int(ctx.get(_ORDER_FACTS_LOAD_COUNT_KEY, 0))
            if loads > 0:
                logger.info("GraphQL operation completed with %s order_facts DB load(s)", loads)
            close_request_session(ctx)
