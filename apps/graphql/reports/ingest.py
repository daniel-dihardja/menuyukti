from collections.abc import Iterable
from dataclasses import dataclass
from datetime import datetime
from typing import Any

import pandas as pd
from menuyukti.core.analytics.esb import normalize_esb_excel
from menuyukti.core.analytics.pos_detector import detect_pos_from_excel_bytes
from menuyukti.core.analytics.quino import normalize_quino_excel
from menuyukti.core.models.pos_mapping import get_config
from menuyukti.core.models.pos_transaction import POSTransactionLineItem
from sqlalchemy import insert
from sqlalchemy.orm import Session

from graphql.data_sources import OrderFact

SUPPORTED_NORMALIZERS = {
    "esb": normalize_esb_excel,
    "quino": normalize_quino_excel,
}


@dataclass
class NormalizedLineItemData:
    billNumber: str
    menu: str
    qty: int
    price: float
    totalAfterBillDiscount: float
    orderTime: datetime
    menuCategory: str
    menuCategoryDetail: str


def _to_python(value: Any) -> Any:
    if hasattr(value, "to_pydatetime"):
        return value.to_pydatetime()
    return value


def _build_rows(df: pd.DataFrame) -> list[NormalizedLineItemData]:
    rows: list[NormalizedLineItemData] = []
    for record in df.to_dict(orient="records"):
        rows.append(
            NormalizedLineItemData(
                billNumber=str(record[POSTransactionLineItem.BILL_NUMBER]),
                menu=str(record[POSTransactionLineItem.MENU]),
                qty=int(record[POSTransactionLineItem.QTY]),
                price=float(record[POSTransactionLineItem.PRICE]),
                totalAfterBillDiscount=float(
                    record[POSTransactionLineItem.TOTAL_AFTER_BILL_DISCOUNT]
                ),
                orderTime=_to_python(record[POSTransactionLineItem.ORDER_TIME]),
                menuCategory=str(record[POSTransactionLineItem.MENU_CATEGORY]),
                menuCategoryDetail=str(record[POSTransactionLineItem.MENU_CATEGORY_DETAIL]),
            )
        )
    return rows


def normalize_sales_report(payload: bytes) -> tuple[list[NormalizedLineItemData], str]:
    pos = detect_pos_from_excel_bytes(payload) or "unknown"
    normalizer = SUPPORTED_NORMALIZERS.get(pos)
    if normalizer is None:
        raise ValueError(f"Unsupported POS system detected: {pos}")

    skip_rows, rename_map = get_config(pos)
    df = normalizer(payload, skiprows=skip_rows)

    if rename_map:
        df = df.rename(columns=rename_map)

    return _build_rows(df), pos


def persist_sales_report(
    session: Session,
    rows: Iterable[NormalizedLineItemData],
    pos_system: str | None,
    analytics_run_id: int | None = None,
) -> None:
    pos = pos_system or "unknown"
    mappings: list[dict[str, object]] = []
    for row in rows:
        order_time_value = row.orderTime
        if not isinstance(order_time_value, datetime):
            order_time_value = datetime.fromisoformat(str(order_time_value))

        mappings.append(
            {
                "analytics_run_id": analytics_run_id,
                "bill_number": row.billNumber,
                "menu": row.menu,
                "qty": row.qty,
                "price": row.price,
                "total_after_bill_discount": row.totalAfterBillDiscount,
                "order_time": order_time_value,
                "menu_category": row.menuCategory,
                "menu_category_detail": row.menuCategoryDetail,
                "pos_system": pos,
            }
        )
    if mappings:
        session.execute(insert(OrderFact), mappings)
    session.commit()
