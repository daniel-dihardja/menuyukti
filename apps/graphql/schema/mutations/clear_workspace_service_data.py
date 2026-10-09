"""Staff-facing mutation to clear location-scoped service data for a Clerk user.

Authority is enforced by the web staff BFF (Menuyukti admin). GraphQL requires an
authenticated caller and blocks production-like runtimes unless ALLOW_DEV_DATA_INGEST=1.
"""

from __future__ import annotations

import os

import strawberry

from graphql.context import request_session_scope
from graphql.schema.auth import user_id_from_info
from graphql.services.clear_service_data import (
    ClearServiceDataResult,
    clear_workspace_service_data,
)
from graphql.services.service_subscriptions import KNOWN_SERVICE_KEYS


def _env_flag_true(name: str) -> bool:
    return os.environ.get(name, "").strip().lower() in {"1", "true", "yes", "on"}


def _is_production_runtime() -> bool:
    """Mirror graphql.server.is_production_runtime (avoid importing server from schema)."""
    for key in ("GRAPHQL_ENV", "ENV", "VERCEL_ENV", "NODE_ENV"):
        if os.environ.get(key, "").strip().lower() == "production":
            return True
    return False


def _assert_clear_service_data_allowed() -> None:
    if _is_production_runtime() and not _env_flag_true("ALLOW_DEV_DATA_INGEST"):
        raise PermissionError(
            "clearWorkspaceServiceData is disabled in production. "
            "Set ALLOW_DEV_DATA_INGEST=1 to enable (staff demos only)."
        )


@strawberry.type
class ClearServiceDataResultType:
    service_key: str
    clerk_user_id: str
    workspace_id: strawberry.ID
    location_ids: list[strawberry.ID]
    predictions_deleted: int
    votings_deleted: int
    ledger_entries_deleted: int
    earn_rules_deleted: int
    pos_orders_deleted: int
    menu_categories_cleared: int
    notes: list[str] = strawberry.field(default_factory=list)


def _to_gql(result: ClearServiceDataResult) -> ClearServiceDataResultType:
    return ClearServiceDataResultType(
        service_key=result.service_key,
        clerk_user_id=result.clerk_user_id,
        workspace_id=strawberry.ID(str(result.workspace_id)),
        location_ids=[strawberry.ID(str(lid)) for lid in result.location_ids],
        predictions_deleted=result.predictions_deleted,
        votings_deleted=result.votings_deleted,
        ledger_entries_deleted=result.ledger_entries_deleted,
        earn_rules_deleted=result.earn_rules_deleted,
        pos_orders_deleted=result.pos_orders_deleted,
        menu_categories_cleared=result.menu_categories_cleared,
        notes=list(result.notes),
    )


@strawberry.type
class ClearWorkspaceServiceDataMutation:
    @strawberry.mutation(
        description=(
            "Clear location-scoped domain data for one service across a Clerk user's "
            "workspace. Does not cancel subscriptions. Staff BFF only; blocked in "
            "production unless ALLOW_DEV_DATA_INGEST=1."
        )
    )
    def clear_workspace_service_data(
        self,
        info: strawberry.Info,
        target_clerk_user_id: str,
        service_key: str,
    ) -> ClearServiceDataResultType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for clearWorkspaceServiceData")
        _assert_clear_service_data_allowed()

        target = (target_clerk_user_id or "").strip()
        if not target:
            raise ValueError("targetClerkUserId is required")

        key = (service_key or "").strip().lower()
        if key not in KNOWN_SERVICE_KEYS:
            raise ValueError(f"serviceKey must be one of {', '.join(sorted(KNOWN_SERVICE_KEYS))}")

        with request_session_scope(info) as session:
            result = clear_workspace_service_data(
                session,
                clerk_user_id=target,
                service_key=key,
            )
            session.commit()
            return _to_gql(result)
