from datetime import datetime
from typing import Any

from io import BytesIO

import strawberry
from openpyxl import load_workbook
from strawberry.file_uploads import Upload

from apps.graphql.data_sources import OrderFact, SessionLocal
from menuyukti.core.analytics.esb import normalize_esb_excel
from menuyukti.core.analytics.pos_detector import detect_pos_from_excel_bytes
from menuyukti.core.models.pos_mapping import get_config
from menuyukti.core.models.pos_transaction import POSTransactionLineItem

SUPPORTED_NORMALIZERS = {
    "esb": normalize_esb_excel,
}


@strawberry.type
class NormalizedLineItem:
    billNumber: str
    menu: str
    qty: int
    price: float
    totalAfterBillDiscount: float
    orderTime: datetime
    menuCategory: str
    menuCategoryDetail: str


@strawberry.type
class ExcelUploadResult:
    filename: str
    sheet_names: list[str]
    header_preview: list[str]
    size_bytes: int
    normalized_rows: list[NormalizedLineItem]


def _to_python(value: Any) -> Any:
    if hasattr(value, "to_pydatetime"):
        return value.to_pydatetime()
    return value


def _build_normalized_rows(df) -> list[NormalizedLineItem]:
    rows: list[NormalizedLineItem] = []
    for record in df.to_dict(orient="records"):
        rows.append(
            NormalizedLineItem(
                billNumber=str(record[POSTransactionLineItem.BILL_NUMBER]),
                menu=str(record[POSTransactionLineItem.MENU]),
                qty=int(record[POSTransactionLineItem.QTY]),
                price=float(record[POSTransactionLineItem.PRICE]),
                totalAfterBillDiscount=float(
                    record[POSTransactionLineItem.TOTAL_AFTER_BILL_DISCOUNT]
                ),
                orderTime=_to_python(record[POSTransactionLineItem.ORDER_TIME]),
                menuCategory=str(record[POSTransactionLineItem.MENU_CATEGORY]),
                menuCategoryDetail=str(
                    record[POSTransactionLineItem.MENU_CATEGORY_DETAIL]
                ),
            )
        )
    return rows


def _normalize_uploaded_excel(payload: bytes) -> tuple[Any, str]:
    pos = detect_pos_from_excel_bytes(payload) or "unknown"
    normalizer = SUPPORTED_NORMALIZERS.get(pos)
    if normalizer is None:
        raise ValueError(f"Unsupported POS system detected: {pos}")

    skip_rows, rename_map = get_config(pos)
    df = normalizer(payload, skiprows=skip_rows)

    if rename_map:
        df = df.rename(columns=rename_map)

    return df, pos


def _persist_order_fact_rows(rows: list[NormalizedLineItem], pos_system: str | None) -> None:
    session = SessionLocal()
    try:
        for row in rows:
            order_time_value = row.orderTime
            if not isinstance(order_time_value, datetime):
                order_time_value = datetime.fromisoformat(order_time_value)

            order = OrderFact(
                bill_number=row.billNumber,
                menu=row.menu,
                qty=row.qty,
                price=row.price,
                total_after_bill_discount=row.totalAfterBillDiscount,
                order_time=order_time_value,
                menu_category=row.menuCategory,
                menu_category_detail=row.menuCategoryDetail,
                pos_system=pos_system or "unknown",
            )
            session.add(order)
        session.commit()
    finally:
        session.close()


@strawberry.type
class Mutation:
    @strawberry.mutation
    async def upload_excel(self, file: Upload) -> ExcelUploadResult:
        payload = await file.read()
        normalized_df, detected_pos = _normalize_uploaded_excel(payload)
        normalized_rows = _build_normalized_rows(normalized_df)
        _persist_order_fact_rows(normalized_rows, detected_pos)

        workbook = load_workbook(filename=BytesIO(payload), read_only=True, data_only=True)
        sheet_names = workbook.sheetnames
        header_preview: list[str] = []

        if sheet_names:
            active_sheet = workbook[sheet_names[0]]
            first_row = next(active_sheet.iter_rows(max_row=1, values_only=True), ())
            header_preview = [str(value) if value is not None else "" for value in first_row]

        workbook.close()

        return ExcelUploadResult(
            filename=file.filename,
            sheet_names=sheet_names,
            header_preview=header_preview,
            size_bytes=len(payload),
            normalized_rows=normalized_rows,
        )
