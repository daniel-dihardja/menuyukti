from __future__ import annotations

from io import BytesIO

import pandas as pd

from menuyukti.core.analytics.utils import normalize_columns
from menuyukti.core.models.pos_transaction import POSTransactionLineItem

_MOKA_SOURCE_COLUMNS = {
    "payment_no",
    "item_name",
    "quantity",
    "price",
    "net_sales",
    "created_at",
    "category",
    "variant_name",
}


def _normalize_category(value: object, fallback: str) -> str:
    if pd.isna(value):
        return fallback
    text = str(value).strip().upper()
    return text if text and text.lower() != "nan" else fallback


def normalize_moka_excel_with_rejections(
    data: bytes,
    skiprows: int = 3,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Load and normalize Moka Export Item Details into:
    - accepted rows (typed and valid)
    - rejected rows with `rejection_reason`
    """
    required_columns = POSTransactionLineItem.get_required_columns()
    COL = POSTransactionLineItem

    source = pd.read_excel(BytesIO(data), skiprows=skiprows)
    source = normalize_columns(source)

    if not _MOKA_SOURCE_COLUMNS.issubset(set(source.columns)):
        raise ValueError(
            "Missing required MOKA columns for Export Item Details: "
            "Payment No, Item Name, Quantity, Price, Net Sales, Created At, "
            "Category, Variant Name. "
            "Expected Moka Reports → Transactions → Export Item Details "
            "(title row + header on row 4)."
        )

    df = source.rename(
        columns={
            "payment_no": COL.BILL_NUMBER,
            "item_name": COL.MENU,
            "quantity": COL.QTY,
            "price": COL.PRICE,
            "net_sales": COL.TOTAL_AFTER_BILL_DISCOUNT,
            "created_at": COL.ORDER_TIME,
            "category": COL.MENU_CATEGORY,
            "variant_name": COL.MENU_CATEGORY_DETAIL,
        }
    )

    df[COL.MENU] = df[COL.MENU].astype("string").str.strip()
    df[COL.BILL_NUMBER] = df[COL.BILL_NUMBER].astype("string").str.strip()
    df[COL.MENU_CATEGORY] = df[COL.MENU_CATEGORY].map(
        lambda value: _normalize_category(value, "OTHER")
    )
    df[COL.MENU_CATEGORY_DETAIL] = df[COL.MENU_CATEGORY_DETAIL].map(
        lambda value: _normalize_category(value, "UNCATEGORIZED")
    )

    empty_menu_mask = df[COL.MENU].isna() | df[COL.MENU].eq("")
    qty_numeric = pd.to_numeric(df[COL.QTY], errors="coerce")
    revenue_numeric = pd.to_numeric(df[COL.TOTAL_AFTER_BILL_DISCOUNT], errors="coerce")
    business_rule_mask = (
        empty_menu_mask
        | qty_numeric.isna()
        | revenue_numeric.isna()
        | (qty_numeric <= 0)
        | (revenue_numeric <= 0)
    )

    rejected_business = df[business_rule_mask].copy()
    rejected_business["rejection_reason"] = "non_positive_qty_or_revenue"

    candidate = df[~business_rule_mask].copy()
    df_required = candidate[required_columns].copy()

    missing_required_mask = df_required.isna().any(axis=1)
    rejected_missing = df_required[missing_required_mask].copy()
    rejected_missing["rejection_reason"] = "missing_required_field"

    accepted = df_required[~missing_required_mask].copy()
    accepted[COL.QTY] = pd.to_numeric(accepted[COL.QTY], errors="coerce")
    accepted[COL.PRICE] = pd.to_numeric(accepted[COL.PRICE], errors="coerce")
    accepted[COL.TOTAL_AFTER_BILL_DISCOUNT] = pd.to_numeric(
        accepted[COL.TOTAL_AFTER_BILL_DISCOUNT],
        errors="coerce",
    )
    accepted[COL.ORDER_TIME] = pd.to_datetime(accepted[COL.ORDER_TIME], errors="coerce")

    invalid_conversion_mask = accepted.isna().any(axis=1)
    rejected_invalid = accepted[invalid_conversion_mask].copy()
    rejected_invalid["rejection_reason"] = "invalid_type_conversion"

    cleaned = accepted[~invalid_conversion_mask].copy()
    cleaned[COL.QTY] = cleaned[COL.QTY].astype(int)

    # POS exports may assign the same menu name to different categories over time.
    # Harmonize to the mode category per menu so downstream heatmap analytics succeed.
    menu_category = cleaned.groupby(COL.MENU)[COL.MENU_CATEGORY].agg(
        lambda values: values.mode().iloc[0] if not values.mode().empty else values.iloc[0]
    )
    menu_category_detail = cleaned.groupby(COL.MENU)[COL.MENU_CATEGORY_DETAIL].agg(
        lambda values: values.mode().iloc[0] if not values.mode().empty else values.iloc[0]
    )
    cleaned[COL.MENU_CATEGORY] = cleaned[COL.MENU].map(menu_category)
    cleaned[COL.MENU_CATEGORY_DETAIL] = cleaned[COL.MENU].map(menu_category_detail)

    rejected = pd.concat(
        [rejected_business, rejected_missing, rejected_invalid],
        ignore_index=True,
    )
    return cleaned, rejected


def normalize_moka_excel(data: bytes, skiprows: int = 3) -> pd.DataFrame:
    cleaned, _ = normalize_moka_excel_with_rejections(data, skiprows=skiprows)
    return cleaned
