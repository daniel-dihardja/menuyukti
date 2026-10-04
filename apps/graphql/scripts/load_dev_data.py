"""CLI entrypoint for selective local seed (make dev-data)."""

from __future__ import annotations

import argparse
import os
import sys

from graphql.data_sources import SessionLocal
from graphql.services.dev_data_seed import (
    DEFAULT_COGS,
    DEFAULT_EXCEL,
    DEV_ANALYTICS_LOCATION_NAME,
    DEV_INVENTAR_LOCATION_NAME,
    DEV_SEED_PREFIX,
    DEV_WORKSPACE_NAME,
    PRIMARY_LOCATION_NAME,
    SCOPES,
    WorkspaceContext,
    ensure_workspace_context,
    run_dev_data_seed,
    seed_analytics,
    seed_kaffeestube_menu,
    seed_warung_sunda_menu,
)

__all__ = [
    "DEFAULT_COGS",
    "DEFAULT_EXCEL",
    "DEV_ANALYTICS_LOCATION_NAME",
    "DEV_INVENTAR_LOCATION_NAME",
    "DEV_SEED_PREFIX",
    "DEV_WORKSPACE_NAME",
    "PRIMARY_LOCATION_NAME",
    "SCOPES",
    "WorkspaceContext",
    "ensure_workspace_context",
    "main",
    "seed_analytics",
    "seed_kaffeestube_menu",
    "seed_warung_sunda_menu",
]


def _resolve_clerk_user_id(cli_value: str | None) -> str:
    if cli_value and cli_value.strip():
        return cli_value.strip()
    env_value = os.environ.get("DEV_CLERK_USER_ID", "").strip()
    if env_value:
        return env_value
    raise SystemExit(
        "ERROR: Clerk user id required. Pass --clerk-user-id, set USER_ID on make, "
        "or export DEV_CLERK_USER_ID to match the signed-in web user."
    )


def main(
    *,
    scope: str,
    clerk_user_id: str,
    excel_path: str | None,
    cogs_path: str | None,
) -> int:
    if scope not in SCOPES:
        raise SystemExit(f"ERROR: --scope must be one of {', '.join(SCOPES)}")

    session = SessionLocal()
    try:
        result = run_dev_data_seed(
            session,
            scope=scope,
            clerk_user_id=clerk_user_id,
            excel_path=excel_path,
            cogs_path=cogs_path,
        )
        session.commit()

        for note in result.notes:
            print(note)

        if result.inventar_cleared:
            print(
                f"Cleared inventar: workspace_id={result.workspace_id} "
                "(catalog, stock, movements). Locations left intact."
            )
        if result.inventar_catalog_items is not None:
            print(
                f"Inventar seed: workspace_id={result.workspace_id} "
                f"inventar_location_id={result.inventar_location_id} "
                f"inventar_location_name={result.inventar_location_name!r} "
                f"catalog={result.inventar_catalog_items} stock={result.inventar_stock_rows} "
                f"movements={result.inventar_movements}"
            )
            print(
                f"Menu seed: location_id={result.inventar_location_id} "
                f"categories={result.inventar_menu_categories} items={result.inventar_menu_items} "
                f"cleared_pos_orders={result.inventar_cleared_pos_orders}"
            )
        if result.analytics_run_id is not None:
            print(
                f"Analytics seed: location_id={result.analytics_location_id} "
                f"location_name={result.analytics_location_name!r} "
                f"run_id={result.analytics_run_id} "
                f"orders={result.analytics_order_rows} location_cogs={result.analytics_location_cogs} "
                f"replaced_seed_runs={result.analytics_deleted_seed_runs} "
                f"pos={result.analytics_pos_system}"
            )
            print(
                f"Menu seed: location_id={result.analytics_location_id} "
                f"categories={result.analytics_menu_categories} items={result.analytics_menu_items} "
                f"cleared_pos_orders={result.analytics_cleared_pos_orders}"
            )

        print(
            f"Done. scope={scope!r} clerk_user_id={clerk_user_id!r} "
            f"workspace_id={result.workspace_id}. "
            "Other tables (CRM, media, styles, …) were left untouched."
        )
        if result.created_primary:
            print("Created primary location with sample opening hours and manual brief.")
    except FileNotFoundError as exc:
        session.rollback()
        raise SystemExit(f"ERROR: {exc}") from exc
    except ValueError as exc:
        session.rollback()
        raise SystemExit(f"ERROR: {exc}") from exc
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description=(
            "Selective local seed for inventar (default) and/or analytics, "
            "or clear inventar only. Does not wipe the database."
        )
    )
    parser.add_argument(
        "--scope",
        choices=SCOPES,
        default="inventar",
        help="What to seed or clear (default: inventar)",
    )
    parser.add_argument(
        "--excel",
        default=None,
        help=f"Sales Excel for analytics scope (default: {DEFAULT_EXCEL})",
    )
    parser.add_argument(
        "--cogs",
        default=None,
        metavar="PATH",
        help=f"menu_cogs.json for analytics scope (default: {DEFAULT_COGS} when present)",
    )
    parser.add_argument(
        "--clerk-user-id",
        default=None,
        metavar="ID",
        help="Clerk user id (or set DEV_CLERK_USER_ID / make USER_ID=...)",
    )
    args = parser.parse_args()
    clerk_user_id = _resolve_clerk_user_id(args.clerk_user_id)
    sys.exit(
        main(
            scope=args.scope,
            clerk_user_id=clerk_user_id,
            excel_path=args.excel,
            cogs_path=args.cogs,
        )
    )
