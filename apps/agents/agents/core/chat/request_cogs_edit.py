"""Show ChatKit COGS edit form inputs (no persist yet)."""

from __future__ import annotations

import json
from typing import Annotated, Any, Literal

from agents_app.agents.core.chat.list_menu_item_cogs import (
    CogsListItem,
    fetch_joined_cogs_for_run,
)
from langchain_core.runnables import RunnableConfig
from langchain_core.tools import InjectedToolArg, tool

COGS_EDIT_FORM_CAP = 20

EditScope = Literal["selected", "missing"]


def select_cogs_edit_items(
    all_items: list[CogsListItem],
    *,
    scope: EditScope,
    menu_names: list[str] | None,
) -> list[CogsListItem] | str:
    """Pick rows for the edit form, or return an error string for the model."""
    if scope == "missing":
        missing_rows = [row for row in all_items if row.get("status") == "missing"]
        if not missing_rows:
            return "No menu items are missing COGS on this sales report."
        return missing_rows[:COGS_EDIT_FORM_CAP]

    names = [n.strip() for n in (menu_names or []) if isinstance(n, str) and n.strip()]
    if not names:
        return (
            "Pass menu_names for scope=selected (one or more menu names), "
            "or use scope=missing to edit all items without COGS."
        )

    by_lower = {
        str(row.get("menu") or "").strip().lower(): row
        for row in all_items
        if isinstance(row.get("menu"), str) and str(row.get("menu")).strip()
    }
    selected: list[CogsListItem] = []
    missing_names: list[str] = []
    seen: set[str] = set()
    for name in names:
        key = name.lower()
        if key in seen:
            continue
        seen.add(key)
        row = by_lower.get(key)
        if row is None:
            missing_names.append(name)
            continue
        selected.append(row)

    if missing_names and not selected:
        return (
            "None of those menu names match the pinned sales report: "
            + ", ".join(missing_names[:10])
        )
    if not selected:
        return "No matching menu items to edit."
    return selected[:COGS_EDIT_FORM_CAP]


def build_cogs_edit_payload(
    items: list[CogsListItem],
    *,
    run_name: str | None = None,
    truncated: bool = False,
) -> dict[str, Any]:
    return {
        "ok": True,
        "action": "request_cogs_edit",
        "run_name": run_name,
        "truncated": truncated,
        "items": items,
        "message": (
            "Show the COGS edit form with input fields for these items. "
            "Saving is not available yet — do not claim values were saved."
        ),
    }


@tool
async def request_cogs_edit(
    menu_names: list[str] | None = None,
    scope: EditScope = "selected",
    config: Annotated[RunnableConfig, InjectedToolArg()] = None,  # type: ignore[assignment]
) -> str:
    """Show ChatKit number inputs so the user can edit COGS for one or more menu items.

    Call after ``list_menu_item_cogs`` (or when the user already knows which items to
    edit). REQUIRED to display input fields — text alone will not show them.

    - ``scope="selected"``: pass ``menu_names`` (exact or case-insensitive match).
    - ``scope="missing"``: show inputs for every item still missing COGS (capped).

    Does **not** save values. Cap is 20 fields per form.
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
        tool_name="request_cogs_edit",
    )
    if isinstance(loaded, str):
        return loaded
    all_items, run_name = loaded

    resolved_scope: EditScope = "missing" if scope == "missing" else "selected"
    selected = select_cogs_edit_items(
        all_items,
        scope=resolved_scope,
        menu_names=menu_names,
    )
    if isinstance(selected, str):
        return selected

    if resolved_scope == "missing":
        full_missing = sum(1 for row in all_items if row.get("status") == "missing")
        truncated = full_missing > len(selected)
    else:
        names = [n.strip() for n in (menu_names or []) if isinstance(n, str) and n.strip()]
        truncated = len(names) > len(selected)

    payload = build_cogs_edit_payload(
        selected,
        run_name=run_name,
        truncated=truncated,
    )
    return json.dumps(payload, ensure_ascii=False)
