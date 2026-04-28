from __future__ import annotations

import re
from io import BytesIO

import pandas as pd

from menuyukti.core.models.pos_transaction import POSTransactionLineItem

_INV_START_RE = re.compile(r"^(INV-[^\s]+)")
_CLOSED_RE = re.compile(r"^Closed at ", re.IGNORECASE)
_CODE_SUFFIX_RE = re.compile(
    r"(?:\s*)"
    r"(F\.LUNCHPROMO\.\d+|LUNCHPROMO\.\d+|FOOD\d+|BVG\d+|MOD\.[A-Z]\.\d+|[A-Z]\.BEV\.\d+)"
    r"(?:-\d+)?$"
)

_SUMMARY_LABELS = {"SUBTOTAL", "DISCOUNT", "SERV CHG", "TAX", "TOTAL"}


def _classify_code_token(code_token: str | None) -> tuple[str, str]:
    if not code_token:
        return "OTHER", "UNCATEGORIZED"
    token = code_token.upper()
    if "LUNCHPROMO" in token:
        return "FOOD", "FOOD"
    if token.startswith("FOOD"):
        return "FOOD", "FOOD"
    if "BVG" in token or ".BEV." in token:
        return "DRINK", "DRINK"
    if token.startswith("MOD."):
        return "MODIFIER", "MODIFIER"
    return "OTHER", token


def _extract_menu_and_code(raw_name: str) -> tuple[str, str | None]:
    m = _CODE_SUFFIX_RE.search(raw_name)
    code_token = m.group(1).upper() if m else None
    menu_name = _CODE_SUFFIX_RE.sub("", raw_name).strip() if m else raw_name.strip()
    if not menu_name:
        menu_name = raw_name.strip()
    return menu_name, code_token


def normalize_quino_excel_with_rejections(
    data: bytes,
    skiprows: int = 0,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    required_columns = POSTransactionLineItem.get_required_columns()
    COL = POSTransactionLineItem

    source = pd.read_excel(BytesIO(data), skiprows=skiprows)
    expected_cols = {"Name", "Qty", "Amount"}
    if not expected_cols.issubset(set(source.columns)):
        raise ValueError("Missing required QUINO columns: Name, Qty, Amount")

    current_bill: str | None = None
    current_order_time: pd.Timestamp | None = None
    rows: list[dict[str, object]] = []

    for record in source.to_dict(orient="records"):
        raw_name = str(record.get("Name", "")).strip()
        qty_raw = record.get("Qty")
        amount_raw = record.get("Amount")

        if not raw_name:
            continue

        inv_match = _INV_START_RE.match(raw_name)
        if inv_match:
            current_bill = inv_match.group(1)
            current_order_time = None
            continue

        if _CLOSED_RE.match(raw_name):
            current_bill = None
            current_order_time = None
            continue

        parsed_order_time = pd.to_datetime(raw_name, errors="coerce")
        if not pd.isna(parsed_order_time):
            current_order_time = parsed_order_time
            continue

        # Keep only line items inside a detected invoice block.
        if current_bill is None:
            continue

        label = raw_name.upper()
        if label in _SUMMARY_LABELS or label.startswith("DISC ") or label.startswith("QRIS "):
            continue
        if label.startswith(("DINE IN", "TAKE AWAY")):
            continue
        if " PERSON" in label and pd.isna(qty_raw):
            continue

        if pd.isna(qty_raw) or pd.isna(amount_raw):
            continue

        menu_name, code_token = _extract_menu_and_code(raw_name)
        menu_category, menu_category_detail = _classify_code_token(code_token)

        qty_numeric = pd.to_numeric(qty_raw, errors="coerce")
        amount_numeric = pd.to_numeric(amount_raw, errors="coerce")
        price_numeric = (
            amount_numeric / qty_numeric
            if pd.notna(qty_numeric) and qty_numeric not in (0, 0.0)
            else amount_numeric
        )

        rows.append(
            {
                COL.BILL_NUMBER: current_bill,
                COL.MENU: menu_name,
                COL.QTY: qty_numeric,
                COL.PRICE: price_numeric,
                COL.TOTAL_AFTER_BILL_DISCOUNT: amount_numeric,
                COL.ORDER_TIME: current_order_time,
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


def normalize_quino_excel(data: bytes, skiprows: int = 0) -> pd.DataFrame:
    cleaned, _ = normalize_quino_excel_with_rejections(data, skiprows=skiprows)
    return cleaned
