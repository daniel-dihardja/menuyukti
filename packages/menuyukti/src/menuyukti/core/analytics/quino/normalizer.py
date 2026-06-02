from __future__ import annotations

from io import BytesIO

import pandas as pd

from menuyukti.core.models.pos_transaction import POSTransactionLineItem

_QUINO_FALLBACK_ORDER_TIME = pd.Timestamp("1970-01-01 00:00:00")


def _classify_from_code(code_token: str | None) -> tuple[str, str]:
    if not isinstance(code_token, str):
        return "OTHER", "UNCATEGORIZED"
    token = code_token.strip().upper()
    if not token:
        return "OTHER", "UNCATEGORIZED"
    if "LUNCHPROMO" in token:
        return "FOOD", "FOOD"
    if token.startswith("FOOD"):
        return "FOOD", "FOOD"
    if "BVG" in token or ".BEV." in token:
        return "DRINK", "DRINK"
    if token.startswith("MOD."):
        return "MODIFIER", "MODIFIER"
    return "OTHER", token


def normalize_quino_excel_with_rejections(
    data: bytes,
    skiprows: int = 3,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    required_columns = POSTransactionLineItem.get_required_columns()
    COL = POSTransactionLineItem

    source = pd.read_excel(BytesIO(data), skiprows=skiprows)
    expected_cols = {"Code", "Name", "Qty", "Net Sales"}
    if not expected_cols.issubset(set(source.columns)):
        raise ValueError(
            "Missing required QUINO columns: Code, Name, Qty, Net Sales. "
            "Expected Quino Item Sales Report export (title row + header on row 4)."
        )

    rows: list[dict[str, object]] = []

    for index, record in enumerate(source.to_dict(orient="records"), start=1):
        name_value = record.get("Name")
        if pd.isna(name_value):
            continue
        raw_name = str(name_value).strip()
        code_value = record.get("Code")
        qty_raw = record.get("Qty")
        net_sales_raw = record.get("Net Sales")

        if not raw_name:
            continue
        if raw_name.lower() == "nan":
            continue

        label = raw_name.upper()
        if label.startswith("TOTAL ") or label == "GRAND TTL":
            continue

        if pd.isna(qty_raw) or pd.isna(net_sales_raw):
            continue

        menu_category, menu_category_detail = _classify_from_code(code_value)

        qty_numeric = pd.to_numeric(qty_raw, errors="coerce")
        net_sales_numeric = pd.to_numeric(net_sales_raw, errors="coerce")
        if pd.isna(qty_numeric) or pd.isna(net_sales_numeric):
            continue
        if qty_numeric <= 0:
            continue
        if net_sales_numeric <= 0:
            continue
        price_numeric = (
            net_sales_numeric / qty_numeric
            if qty_numeric not in (0, 0.0)
            else net_sales_numeric
        )

        rows.append(
            {
                COL.BILL_NUMBER: f"QUINO-ITEM-{index:06d}",
                COL.MENU: raw_name,
                COL.QTY: qty_numeric,
                COL.PRICE: price_numeric,
                COL.TOTAL_AFTER_BILL_DISCOUNT: net_sales_numeric,
                COL.ORDER_TIME: _QUINO_FALLBACK_ORDER_TIME,
                COL.MENU_CATEGORY: menu_category,
                COL.MENU_CATEGORY_DETAIL: menu_category_detail,
            }
        )

    df_required = pd.DataFrame(rows, columns=required_columns)

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

    rejected = pd.concat([rejected_missing, rejected_invalid], ignore_index=True)
    return cleaned, rejected


def normalize_quino_excel(data: bytes, skiprows: int = 3) -> pd.DataFrame:
    cleaned, _ = normalize_quino_excel_with_rejections(data, skiprows=skiprows)
    return cleaned
