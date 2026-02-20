"""Tests for POSTransactionLineItem model - the foundational data contract."""

from datetime import datetime

import pytest
from pydantic import ValidationError

from menuyukti.core.models.pos_transaction import POSTransactionLineItem


def test_valid_pos_transaction_line_item():
    """Test creating a valid POS transaction line item."""
    item = POSTransactionLineItem(
        bill_number="ORD-2026-001",
        menu="Nasi Goreng Special",
        qty=2,
        price=45000.00,
        total_after_bill_discount=85500.00,
        order_time=datetime(2026, 1, 15, 12, 30),
        menu_category="Main Course",
        menu_category_detail="Rice Dishes",
    )

    assert item.bill_number == "ORD-2026-001"
    assert item.menu == "Nasi Goreng Special"
    assert item.qty == 2
    assert item.price == 45000.00
    assert item.total_after_bill_discount == 85500.00
    assert item.order_time == datetime(2026, 1, 15, 12, 30)
    assert item.menu_category == "Main Course"
    assert item.menu_category_detail == "Rice Dishes"


def test_pos_transaction_is_immutable():
    """Test that POSTransactionLineItem is immutable (frozen)."""
    item = POSTransactionLineItem(
        bill_number="ORD-001",
        menu="Coffee",
        qty=1,
        price=5.00,
        total_after_bill_discount=5.00,
        order_time=datetime(2026, 1, 15),
        menu_category="Beverages",
        menu_category_detail="Hot Drinks",
    )

    with pytest.raises(ValidationError):
        item.qty = 2  # Should fail - model is frozen


def test_pos_transaction_rejects_zero_quantity():
    """Test that zero quantity is rejected."""
    with pytest.raises(ValidationError) as exc_info:
        POSTransactionLineItem(
            bill_number="ORD-001",
            menu="Coffee",
            qty=0,  # Invalid
            price=5.00,
            total_after_bill_discount=5.00,
            order_time=datetime(2026, 1, 15),
            menu_category="Beverages",
            menu_category_detail="Hot Drinks",
        )

    assert "qty" in str(exc_info.value)


def test_pos_transaction_rejects_negative_quantity():
    """Test that negative quantity is rejected."""
    with pytest.raises(ValidationError) as exc_info:
        POSTransactionLineItem(
            bill_number="ORD-001",
            menu="Coffee",
            qty=-1,  # Invalid
            price=5.00,
            total_after_bill_discount=5.00,
            order_time=datetime(2026, 1, 15),
            menu_category="Beverages",
            menu_category_detail="Hot Drinks",
        )

    assert "qty" in str(exc_info.value)


def test_pos_transaction_rejects_zero_revenue():
    """Test that zero revenue is rejected (cancelled/void transactions)."""
    with pytest.raises(ValidationError) as exc_info:
        POSTransactionLineItem(
            bill_number="ORD-001",
            menu="Coffee",
            qty=1,
            price=5.00,
            total_after_bill_discount=0.00,  # Invalid
            order_time=datetime(2026, 1, 15),
            menu_category="Beverages",
            menu_category_detail="Hot Drinks",
        )

    assert "total_after_bill_discount" in str(exc_info.value)


def test_pos_transaction_rejects_negative_revenue():
    """Test that negative revenue is rejected."""
    with pytest.raises(ValidationError) as exc_info:
        POSTransactionLineItem(
            bill_number="ORD-001",
            menu="Coffee",
            qty=1,
            price=5.00,
            total_after_bill_discount=-5.00,  # Invalid
            order_time=datetime(2026, 1, 15),
            menu_category="Beverages",
            menu_category_detail="Hot Drinks",
        )

    assert "total_after_bill_discount" in str(exc_info.value)


def test_get_required_columns():
    """Test that get_required_columns returns all expected columns."""
    columns = POSTransactionLineItem.get_required_columns()

    assert columns == [
        "bill_number",
        "menu",
        "qty",
        "price",
        "total_after_bill_discount",
        "order_time",
        "menu_category",
        "menu_category_detail",
    ]


def test_column_constants():
    """Test that column constants match expected values."""
    assert POSTransactionLineItem.BILL_NUMBER == "bill_number"
    assert POSTransactionLineItem.MENU == "menu"
    assert POSTransactionLineItem.QTY == "qty"
    assert POSTransactionLineItem.PRICE == "price"
    assert (
        POSTransactionLineItem.TOTAL_AFTER_BILL_DISCOUNT == "total_after_bill_discount"
    )
    assert POSTransactionLineItem.ORDER_TIME == "order_time"
    assert POSTransactionLineItem.MENU_CATEGORY == "menu_category"
    assert POSTransactionLineItem.MENU_CATEGORY_DETAIL == "menu_category_detail"
