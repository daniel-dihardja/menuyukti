"""Menu engineering matrix slices for promotion picks: by POS menu_category or flat."""

from __future__ import annotations

from typing import Any, Literal

from menuyukti.core.analytics.calculate_menu_engineering_matrix import (
    MenuEngineeringMatrixItem,
    MenuEngineeringMatrixResult,
    OrderRowForMatrix,
    compute_menu_engineering_from_orders,
)


def _normalized_menu_category(row: OrderRowForMatrix) -> str | None:
    raw = row.get("menu_category")
    if raw is None:
        return None
    s = str(raw).strip()
    return s if s else None


def _top_quadrant_items(
    matrix: MenuEngineeringMatrixResult,
    quadrant: Literal["star", "puzzle"],
    limit: int,
) -> list[MenuEngineeringMatrixItem]:
    items = [it for it in matrix["items"] if str(it.get("category", "")) == quadrant]
    items.sort(
        key=lambda it: (
            -float(it.get("contribution_margin") or 0.0),
            -int(it.get("quantity") or 0),
            str(it.get("menu") or ""),
        ),
    )
    return items[:limit]


def _bucket_payload(
    rows: list[OrderRowForMatrix],
    cogs_by_menu: dict[str, float],
    *,
    top_per_quadrant: int,
) -> dict[str, Any]:
    if not rows:
        return {
            "matrix": None,
            "topStars": [],
            "topPuzzles": [],
            "reason": "no rows in bucket",
        }
    try:
        matrix = compute_menu_engineering_from_orders(rows, cogs_by_menu)
    except ValueError as exc:
        return {
            "matrix": None,
            "topStars": [],
            "topPuzzles": [],
            "reason": str(exc) or "matrix unavailable",
        }
    return {
        "matrix": matrix,
        "topStars": _top_quadrant_items(matrix, "star", top_per_quadrant),
        "topPuzzles": _top_quadrant_items(matrix, "puzzle", top_per_quadrant),
    }


def compute_menu_engineering_promotion_candidates(
    order_rows: list[OrderRowForMatrix],
    cogs_by_menu: dict[str, float],
    *,
    top_per_quadrant: int = 5,
) -> dict[str, Any]:
    """
    Run menu engineering per distinct ``menu_category`` when any row has a non-empty
    category; otherwise one matrix on all rows (flat).

    Grouped mode only includes rows with non-empty trimmed ``menu_category``;
    rows without category are counted in ``rowsSkippedMissingCategory`` and
    omitted from per-category slices.

    Args:
        order_rows: Line-level rows (see :class:`OrderRowForMatrix`).
        cogs_by_menu: Menu name -> unit COGS.
        top_per_quadrant: Max items per star / puzzle list per bucket.

    Returns:
        JSON-friendly dict: either ``grouping="flat"`` with ``matrix``, ``topStars``,
        ``topPuzzles``, or ``grouping="by_menu_category"`` with ``categories`` map
        keyed by exact ``menu_category`` strings from the data.
    """
    if not order_rows:
        msg = "order_rows must not be empty"
        raise ValueError(msg)

    skipped = 0
    by_category: dict[str, list[OrderRowForMatrix]] = {}
    for row in order_rows:
        key = _normalized_menu_category(row)
        if key is None:
            skipped += 1
            continue
        by_category.setdefault(key, []).append(row)

    if not by_category:
        flat = _bucket_payload(order_rows, cogs_by_menu, top_per_quadrant=top_per_quadrant)
        return {
            "grouping": "flat",
            "rowsSkippedMissingCategory": skipped,
            **flat,
        }

    categories_out: dict[str, Any] = {}
    for cat in sorted(by_category.keys()):
        categories_out[cat] = _bucket_payload(
            by_category[cat],
            cogs_by_menu,
            top_per_quadrant=top_per_quadrant,
        )

    return {
        "grouping": "by_menu_category",
        "rowsSkippedMissingCategory": skipped,
        "categories": categories_out,
    }
