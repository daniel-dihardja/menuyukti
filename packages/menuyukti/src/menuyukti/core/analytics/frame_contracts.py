"""
DataFrame shape contracts for analytics.

Use :func:`require_columns` at the start of any ``calculate_*(df: pd.DataFrame)``
so callers get clear errors instead of ``KeyError`` mid-pipeline.

Convention for new analytics (see also package ``__init__.py`` docstring):

1. Define a ``TypedDict`` for line-level rows.
2. Expose ``compute_<name>_from_orders(rows: list[...])`` that builds a DataFrame
   and calls ``calculate_<name>(df)``.
3. Call ``require_columns`` (or :func:`ensure_optional_category_columns`) first in
   ``calculate_<name>``.
"""

from __future__ import annotations

from collections.abc import Sequence

import pandas as pd

from menuyukti.core.models.pos_transaction import POSTransactionLineItem

_COL = POSTransactionLineItem


def require_columns(
    df: pd.DataFrame,
    required: Sequence[str],
    *,
    context: str = "",
) -> None:
    """
    Raise ``ValueError`` if any required column is missing from ``df``.

    Args:
        df: Input frame.
        required: Column names that must be present.
        context: Optional prefix for the error message (e.g. function name).
    """
    missing = [c for c in required if c not in df.columns]
    if not missing:
        return
    prefix = f"{context}: " if context else ""
    raise ValueError(f"{prefix}Missing required columns: {missing}")


def line_item_columns_full() -> list[str]:
    """All columns aligned with :class:`POSTransactionLineItem` (sales analytics path)."""
    return list(POSTransactionLineItem.get_required_columns())


def popularity_index_columns() -> list[str]:
    """Minimum columns for :func:`calculate_popularity_index`."""
    return [_COL.MENU, _COL.QTY]


def extract_menu_items_required_columns() -> list[str]:
    """Required columns for :func:`extract_menu_items` (category columns are optional)."""
    return [_COL.MENU, _COL.QTY, _COL.PRICE]


def ensure_optional_category_columns(df: pd.DataFrame) -> pd.DataFrame:
    """
    Ensure ``menu_category`` and ``menu_category_detail`` exist, filling with
    ``None`` when absent (same idea as heatmap aggregation helpers).
    """
    if _COL.MENU_CATEGORY in df.columns and _COL.MENU_CATEGORY_DETAIL in df.columns:
        return df
    out = df.copy()
    if _COL.MENU_CATEGORY not in out.columns:
        out[_COL.MENU_CATEGORY] = None
    if _COL.MENU_CATEGORY_DETAIL not in out.columns:
        out[_COL.MENU_CATEGORY_DETAIL] = None
    return out
