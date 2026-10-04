"""Staff-facing mutation to run make dev-data seed scopes for a Clerk user.

Authority is enforced by the web staff BFF (Menuyukti admin). GraphQL requires an
authenticated caller and blocks production-like runtimes unless ALLOW_DEV_DATA_INGEST=1.
"""

from __future__ import annotations

import os

import strawberry

from graphql.context import request_session_scope
from graphql.schema.auth import user_id_from_info
from graphql.services.dev_data_seed import SCOPES, DevDataSeedResult, run_dev_data_seed


def _env_flag_true(name: str) -> bool:
    return os.environ.get(name, "").strip().lower() in {"1", "true", "yes", "on"}


def _is_production_runtime() -> bool:
    """Mirror graphql.server.is_production_runtime (avoid importing server from schema)."""
    for key in ("GRAPHQL_ENV", "ENV", "VERCEL_ENV", "NODE_ENV"):
        if os.environ.get(key, "").strip().lower() == "production":
            return True
    return False


def _assert_dev_data_ingest_allowed() -> None:
    if _is_production_runtime() and not _env_flag_true("ALLOW_DEV_DATA_INGEST"):
        raise PermissionError(
            "ingestDevData is disabled in production. "
            "Set ALLOW_DEV_DATA_INGEST=1 to enable (staff demos only)."
        )


@strawberry.type
class DevDataSeedResultType:
    scope: str
    clerk_user_id: str
    workspace_id: strawberry.ID
    created_primary: bool
    inventar_cleared: bool
    inventar_location_id: strawberry.ID | None = None
    inventar_location_name: str | None = None
    analytics_location_id: strawberry.ID | None = None
    analytics_location_name: str | None = None
    inventar_catalog_items: int | None = None
    inventar_stock_rows: int | None = None
    inventar_movements: int | None = None
    inventar_menu_categories: int | None = None
    inventar_menu_items: int | None = None
    inventar_cleared_pos_orders: int | None = None
    analytics_run_id: strawberry.ID | None = None
    analytics_order_rows: int | None = None
    analytics_location_cogs: int | None = None
    analytics_deleted_seed_runs: int | None = None
    analytics_pos_system: str | None = None
    analytics_menu_categories: int | None = None
    analytics_menu_items: int | None = None
    analytics_cleared_pos_orders: int | None = None
    notes: list[str] = strawberry.field(default_factory=list)


def _to_gql(result: DevDataSeedResult) -> DevDataSeedResultType:
    return DevDataSeedResultType(
        scope=result.scope,
        clerk_user_id=result.clerk_user_id,
        workspace_id=strawberry.ID(str(result.workspace_id)),
        created_primary=result.created_primary,
        inventar_cleared=result.inventar_cleared,
        inventar_location_id=(
            strawberry.ID(str(result.inventar_location_id))
            if result.inventar_location_id is not None
            else None
        ),
        inventar_location_name=result.inventar_location_name,
        analytics_location_id=(
            strawberry.ID(str(result.analytics_location_id))
            if result.analytics_location_id is not None
            else None
        ),
        analytics_location_name=result.analytics_location_name,
        inventar_catalog_items=result.inventar_catalog_items,
        inventar_stock_rows=result.inventar_stock_rows,
        inventar_movements=result.inventar_movements,
        inventar_menu_categories=result.inventar_menu_categories,
        inventar_menu_items=result.inventar_menu_items,
        inventar_cleared_pos_orders=result.inventar_cleared_pos_orders,
        analytics_run_id=(
            strawberry.ID(str(result.analytics_run_id))
            if result.analytics_run_id is not None
            else None
        ),
        analytics_order_rows=result.analytics_order_rows,
        analytics_location_cogs=result.analytics_location_cogs,
        analytics_deleted_seed_runs=result.analytics_deleted_seed_runs,
        analytics_pos_system=result.analytics_pos_system,
        analytics_menu_categories=result.analytics_menu_categories,
        analytics_menu_items=result.analytics_menu_items,
        analytics_cleared_pos_orders=result.analytics_cleared_pos_orders,
        notes=list(result.notes),
    )


@strawberry.type
class IngestDevDataMutation:
    @strawberry.mutation(
        description=(
            "Run selective mock seed (inventar / analytics / all / clear-inventar) for a "
            "Clerk user's workspace. Same data as make dev-data. Staff BFF only; "
            "blocked in production unless ALLOW_DEV_DATA_INGEST=1."
        )
    )
    def ingest_dev_data(
        self,
        info: strawberry.Info,
        target_clerk_user_id: str,
        scope: str,
    ) -> DevDataSeedResultType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for ingestDevData")
        _assert_dev_data_ingest_allowed()

        normalized_scope = (scope or "").strip()
        if normalized_scope not in SCOPES:
            raise ValueError(f"scope must be one of {', '.join(SCOPES)}")

        target = (target_clerk_user_id or "").strip()
        if not target:
            raise ValueError("targetClerkUserId is required")

        with request_session_scope(info) as session:
            result = run_dev_data_seed(
                session,
                scope=normalized_scope,
                clerk_user_id=target,
            )
            session.commit()
            return _to_gql(result)
