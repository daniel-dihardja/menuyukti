"""Tests for DataFrame column contracts and guarded analytics entry points."""

from datetime import datetime

import pandas as pd
import pytest

from menuyukti.core.analytics.calculate_popularity_index import calculate_popularity_index
from menuyukti.core.analytics.calculate_sales_analytics import calculate_sales_analytics
from menuyukti.core.analytics.extract_menu_items import extract_menu_items
from menuyukti.core.analytics.frame_contracts import (
    ensure_optional_category_columns,
    require_columns,
)
from menuyukti.core.models.pos_transaction import POSTransactionLineItem


def test_require_columns_passes_when_present():
    df = pd.DataFrame({"a": [1], "b": [2]})
    require_columns(df, ["a", "b"])


def test_require_columns_raises_with_missing_and_context():
    df = pd.DataFrame({"a": [1]})
    with pytest.raises(ValueError, match="my_fn: Missing required columns: \\['b'\\]"):
        require_columns(df, ["a", "b"], context="my_fn")


def test_ensure_optional_category_columns_adds_missing():
    df = pd.DataFrame({"menu": ["x"], "qty": [1], "price": [2.0]})
    out = ensure_optional_category_columns(df)
    assert "menu_category" in out.columns
    assert "menu_category_detail" in out.columns
    assert out["menu_category"].iloc[0] is None
    assert out["menu_category_detail"].iloc[0] is None


def _minimal_sales_row() -> dict[str, object]:
    return {
        "bill_number": "B1",
        "menu": "M1",
        "qty": 1,
        "price": 10.0,
        "total_after_bill_discount": 10.0,
        "order_time": datetime(2026, 1, 15, 12, 0, 0),
        "menu_category": "Cat",
        "menu_category_detail": "Det",
    }


def test_calculate_sales_analytics_missing_column_raises():
    row = _minimal_sales_row()
    del row["menu"]
    df = pd.DataFrame([row])
    with pytest.raises(ValueError, match="calculate_sales_analytics: Missing required columns"):
        calculate_sales_analytics(df)


def test_calculate_popularity_index_missing_column_raises():
    df = pd.DataFrame([{"menu": "A", "qty": 1}])
    df_bad = df.drop(columns=["qty"])
    with pytest.raises(ValueError, match="calculate_popularity_index: Missing required columns"):
        calculate_popularity_index(df_bad)


def test_extract_menu_items_without_category_columns():
    df = pd.DataFrame(
        [
            {"menu": "A", "qty": 2, "price": 5.0},
            {"menu": "B", "qty": 1, "price": 10.0},
        ]
    )
    out = extract_menu_items(df)
    assert len(out) == 2
    assert out[0]["menu_category"] is None
    assert out[0]["menu_category_detail"] is None


def test_extract_menu_items_missing_price_raises():
    df = pd.DataFrame([{"menu": "A", "qty": 1}])
    with pytest.raises(ValueError, match="extract_menu_items: Missing required columns"):
        extract_menu_items(df)


def test_line_item_columns_full_matches_pos_model():
    cols = POSTransactionLineItem.get_required_columns()
    df = pd.DataFrame([_minimal_sales_row()])
    require_columns(df, cols)


def test_calculate_sales_analytics_returns_fundamental_only_when_capabilities_disabled():
    df = pd.DataFrame([_minimal_sales_row()])
    out = calculate_sales_analytics(df, has_order_id=False, has_datetime=False)
    assert out["capabilities"]["has_order_id"] is False
    assert out["capabilities"]["has_datetime"] is False
    assert out["additional_signals"]["order_signals"] is None
    assert out["additional_signals"]["datetime_signals"] is None
    assert out["fundamental_signals"]["total_revenue"] == 10.0


def test_calculate_sales_analytics_enables_order_signals_when_order_id_available():
    rows = [_minimal_sales_row(), {**_minimal_sales_row(), "bill_number": "B2", "qty": 2, "price": 5.0}]
    out = calculate_sales_analytics(pd.DataFrame(rows), has_datetime=False)
    assert out["capabilities"]["has_order_id"] is True
    assert out["additional_signals"]["order_signals"] is not None
    assert out["additional_signals"]["order_signals"]["total_orders"] == 2


def test_calculate_sales_analytics_enables_datetime_signals_with_real_datetime():
    df = pd.DataFrame([_minimal_sales_row()])
    out = calculate_sales_analytics(df, has_order_id=False, has_datetime=True)
    assert out["additional_signals"]["datetime_signals"] is not None
    assert out["additional_signals"]["datetime_signals"]["period_start"] == "2026-01-15"
