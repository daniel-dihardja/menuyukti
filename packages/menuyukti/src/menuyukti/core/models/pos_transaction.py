"""
POS Transaction Line Item - The foundational data contract.

This represents a single line item from a restaurant POS system transaction.
All menuyukti analytics derive from aggregations of these line items.

This is the boundary between external POS systems and menuyukti's analytics engine.
"""

from datetime import datetime
from typing import ClassVar

from pydantic import BaseModel, ConfigDict, Field, field_validator


class POSTransactionLineItem(BaseModel):
    """
    Raw POS transaction line item from external systems.

    This is the foundational data contract - all menuyukti analytics derive from
    aggregations of these transaction line items.

    Field semantics:
        - bill_number: Unique identifier for an order/bill (multiple line items per bill)
        - menu: The menu item name as it appears in the POS system
        - qty: Quantity of this menu item ordered (must be positive integer)
        - price: Unit price per item (before any discounts)
        - total_after_bill_discount: Final line item revenue after bill-level discounts
        - order_time: Timestamp when the order was placed
        - menu_category: Top-level category (e.g., "Beverages", "Main Course")
        - menu_category_detail: Subcategory or additional classification

    Data quality rules:
        - qty must be positive (no negative or zero quantities)
        - total_after_bill_discount must be positive (excludes cancelled/test orders)
        - All fields are required (no nulls/missing values)

    Example:
        >>> item = POSTransactionLineItem(
        ...     bill_number="ORD-2026-001",
        ...     menu="Nasi Goreng Special",
        ...     qty=2,
        ...     price=45000.00,
        ...     total_after_bill_discount=85500.00,
        ...     order_time=datetime(2026, 1, 15, 12, 30),
        ...     menu_category="Main Course",
        ...     menu_category_detail="Rice Dishes"
        ... )
    """

    model_config = ConfigDict(frozen=True)  # Immutable - source data shouldn't change

    # Column name constants for pandas interop
    BILL_NUMBER: ClassVar[str] = "bill_number"
    MENU: ClassVar[str] = "menu"
    QTY: ClassVar[str] = "qty"
    PRICE: ClassVar[str] = "price"
    TOTAL_AFTER_BILL_DISCOUNT: ClassVar[str] = "total_after_bill_discount"
    ORDER_TIME: ClassVar[str] = "order_time"
    MENU_CATEGORY: ClassVar[str] = "menu_category"
    MENU_CATEGORY_DETAIL: ClassVar[str] = "menu_category_detail"

    # Field definitions
    bill_number: str = Field(
        description="Unique order/bill identifier (groups line items into orders)"
    )
    menu: str = Field(description="Menu item name as it appears in POS system")
    qty: int = Field(gt=0, description="Quantity ordered (must be positive integer)")
    price: float = Field(ge=0, description="Unit price per item before discounts")
    total_after_bill_discount: float = Field(
        gt=0,
        description="Line item revenue after bill-level discounts (must be positive)",
    )
    order_time: datetime = Field(description="Timestamp when order was placed")
    menu_category: str = Field(description="Top-level menu category classification")
    menu_category_detail: str = Field(
        description="Subcategory or additional menu classification"
    )

    @field_validator("total_after_bill_discount")
    @classmethod
    def validate_revenue_positive(cls, v: float) -> float:
        """
        Ensure revenue is positive to exclude cancelled, void, or test transactions.

        Transactions with zero or negative revenue indicate:
        - Order cancellations
        - Void transactions
        - Test/training data
        - System errors

        These should be excluded from analytics to prevent skewed metrics.
        """
        if v <= 0:
            raise ValueError(
                f"total_after_bill_discount must be positive, got {v}. "
                "Zero/negative values indicate cancelled or invalid transactions."
            )
        return v

    @classmethod
    def get_required_columns(cls) -> list[str]:
        """
        Get list of required column names for pandas DataFrame validation.

        Returns:
            List of column names that must be present in source data.

        Example:
            >>> POSTransactionLineItem.get_required_columns()
            ['bill_number', 'menu', 'qty', 'price', 'total_after_bill_discount',
             'order_time', 'menu_category', 'menu_category_detail']
        """
        return [
            cls.BILL_NUMBER,
            cls.MENU,
            cls.QTY,
            cls.PRICE,
            cls.TOTAL_AFTER_BILL_DISCOUNT,
            cls.ORDER_TIME,
            cls.MENU_CATEGORY,
            cls.MENU_CATEGORY_DETAIL,
        ]
