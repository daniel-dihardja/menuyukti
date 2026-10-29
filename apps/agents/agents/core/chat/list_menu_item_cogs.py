"""List menu COGS for the pinned analytics run (read-only)."""

from __future__ import annotations

import asyncio
import json
from typing import Annotated, Any, Literal

from agents_app.agents.core.chat.http_context import get_chat_http_client
from agents_app.agents.core.chat.sanitize_tool_errors import sanitize_tool_error_message
from agents_app.agents.core.chat.untrusted_context import wrap_untrusted
from agents_app.agents.graphql_base import graphql_post
from agents_app.agents.graphql_operations import (
    ANALYTICS_RUN_COGS_QUERY,
    MENU_ITEMS_CATALOG_FOR_RUN_QUERY,
)
from langchain_core.runnables import RunnableConfig
from langchain_core.tools import InjectedToolArg, tool

CogsStatus = Literal["set", "missing"]

CogsListItem = dict[str, Any]


def join_catalog_with_cogs(
    catalog_items: list[dict[str, Any]],
    cogs_rows: list[dict[str, Any]],
) -> list[CogsListItem]:
    """Join sales-run menu lines with COGS rows; orphan COGS stay as set."""
    cogs_by_menu: dict[str, dict[str, Any]] = {}
    for row in cogs_rows:
        menu = row.get("menu")
        if not isinstance(menu, str) or not menu.strip():
            continue
        cogs_by_menu[menu] = row

    seen: set[str] = set()
    out: list[CogsListItem] = []
    for item in catalog_items:
        name = item.get("name")
        if not isinstance(name, str) or not name.strip():
            continue
        seen.add(name)
        existing = cogs_by_menu.get(name)
        category = item.get("category")
        if not isinstance(category, str) or not category.strip():
            category = None
        if existing is not None:
            cogs_val = existing.get("cogs")
            currency = existing.get("currency")
            cat = existing.get("menuCategory")
            if isinstance(cat, str) and cat.strip():
                category = cat
            out.append(
                {
                    "menu": name,
                    "category": category,
                    "cogs": cogs_val if isinstance(cogs_val, (int, float)) else None,
                    "currency": currency if isinstance(currency, str) else None,
                    "status": "set",
                }
            )
        else:
            out.append(
                {
                    "menu": name,
                    "category": category,
                    "cogs": None,
                    "currency": None,
                    "status": "missing",
                }
            )

    for menu, row in cogs_by_menu.items():
        if menu in seen:
            continue
        cogs_val = row.get("cogs")
        currency = row.get("currency")
        category = row.get("menuCategory")
        out.append(
            {
                "menu": menu,
                "category": category if isinstance(category, str) else None,
                "cogs": cogs_val if isinstance(cogs_val, (int, float)) else None,
                "currency": currency if isinstance(currency, str) else None,
                "status": "set",
            }
        )

    out.sort(key=lambda row: str(row.get("menu") or "").lower())
    return out


def format_cogs_list_markdown(
    items: list[CogsListItem],
    *,
    run_name: str | None = None,
    run_id: str | int | None = None,
) -> str:
    """Compact markdown table for the model (also stored on the JSON payload)."""
    total = len(items)
    missing = sum(1 for row in items if row.get("status") == "missing")
    header_bits = ["COGS for pinned sales report"]
    if run_name:
        header_bits.append(f"({run_name})")
    if run_id is not None:
        header_bits.append(f"run={run_id}")
    lines = [
        " ".join(header_bits),
        f"{total} items, {missing} missing",
        "",
        "| Menu | Category | COGS | Status |",
        "| --- | --- | --- | --- |",
    ]
    for row in items:
        menu = str(row.get("menu") or "").replace("|", "/")
        category = str(row.get("category") or "—").replace("|", "/")
        status = str(row.get("status") or "missing")
        if status == "missing" or row.get("cogs") is None:
            cogs_cell = "—"
            status_cell = "MISSING"
        else:
            currency = row.get("currency")
            cogs_cell = str(row["cogs"])
            if isinstance(currency, str) and currency.strip():
                cogs_cell = f"{cogs_cell} {currency.strip()}"
            status_cell = "set"
        lines.append(f"| {menu} | {category} | {cogs_cell} | {status_cell} |")
    return "\n".join(lines)


def build_cogs_list_payload(
    items: list[CogsListItem],
    *,
    run_name: str | None = None,
    run_id: str | int | None = None,
) -> dict[str, Any]:
    total = len(items)
    missing_count = sum(1 for row in items if row.get("status") == "missing")
    markdown = format_cogs_list_markdown(items, run_name=run_name, run_id=run_id)
    return {
        "ok": True,
        "summary": {
            "total": total,
            "missing_count": missing_count,
            "run_id": run_id,
            "run_name": run_name,
        },
        "items": items,
        "markdown": wrap_untrusted("menu_item_cogs", markdown),
    }


async def fetch_joined_cogs_for_run(
    *,
    analytics_run_id: str | int,
    user_id: str,
    tool_name: str = "list_menu_item_cogs",
) -> tuple[list[CogsListItem], str | None] | str:
    """Load catalog+COGS join for a run.

    Returns ``(items, run_name)`` on success, or an error string for the model.
    """
    run_id_str = str(analytics_run_id)
    client = get_chat_http_client()
    try:
        catalog_data, cogs_data = await asyncio.gather(
            graphql_post(
                client,
                MENU_ITEMS_CATALOG_FOR_RUN_QUERY,
                {"analyticsRunId": run_id_str},
                str(user_id),
            ),
            graphql_post(
                client,
                ANALYTICS_RUN_COGS_QUERY,
                {"id": run_id_str},
                str(user_id),
            ),
        )
    except Exception as exc:  # noqa: BLE001 — return to model; do not crash the ReAct turn
        return sanitize_tool_error_message(tool_name, exc)

    catalog_payload = catalog_data.get("menuItemsCatalogForRun")
    catalog_items: list[dict[str, Any]] = []
    if isinstance(catalog_payload, dict):
        raw_items = catalog_payload.get("items")
        if isinstance(raw_items, list):
            catalog_items = [item for item in raw_items if isinstance(item, dict)]

    run = cogs_data.get("analyticsRun")
    if not isinstance(run, dict):
        return "Analytics run not found or access denied."

    run_name = run.get("name") if isinstance(run.get("name"), str) else None
    raw_cogs = run.get("menuItemCogs")
    cogs_rows: list[dict[str, Any]] = []
    if isinstance(raw_cogs, list):
        cogs_rows = [row for row in raw_cogs if isinstance(row, dict)]

    items = join_catalog_with_cogs(catalog_items, cogs_rows)
    return items, run_name


@tool
async def list_menu_item_cogs(
    config: Annotated[RunnableConfig, InjectedToolArg()] = None,  # type: ignore[assignment]
) -> str:
    """List COGS for every menu item on the pinned sales report.

    Call when the user asks about COGS, food cost, missing costs, or wants to review
    or edit costs for the attached analytics run. Marks items without a COGS value as
    missing. Read-only — does not save edits. After listing, call ``request_cogs_edit``
    to show input fields when the user wants to edit one or more items.
    """
    c = (config or {}).get("configurable") or {}
    analytics_run_id = c.get("analytics_run_id")
    user_id = c.get("user_id")
    if analytics_run_id is None or not user_id:
        return (
            "Sales report context is not available (missing pinned report). "
            "Attach a sales report in the advisor composer, then ask again."
        )

    loaded = await fetch_joined_cogs_for_run(
        analytics_run_id=analytics_run_id,
        user_id=str(user_id),
    )
    if isinstance(loaded, str):
        return loaded
    items, run_name = loaded
    payload = build_cogs_list_payload(items, run_name=run_name, run_id=analytics_run_id)
    return json.dumps(payload, ensure_ascii=False)
