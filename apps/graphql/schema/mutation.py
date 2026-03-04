from dataclasses import asdict
from datetime import datetime
from io import BytesIO

import strawberry
from openpyxl import load_workbook
from strawberry.file_uploads import Upload

from graphql.reports import normalize_sales_report, persist_sales_report


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


@strawberry.type
class Mutation:
    @strawberry.mutation
    async def upload_sales_report(self, file: Upload) -> ExcelUploadResult:
        payload = await file.read()
        normalized_rows_data, detected_pos = normalize_sales_report(payload)
        persist_sales_report(normalized_rows_data, detected_pos)

        normalized_rows = [
            NormalizedLineItem(**asdict(row)) for row in normalized_rows_data
        ]

        workbook = load_workbook(
            filename=BytesIO(payload), read_only=True, data_only=True
        )
        sheet_names = workbook.sheetnames
        header_preview: list[str] = []

        if sheet_names:
            active_sheet = workbook[sheet_names[0]]
            first_row = next(active_sheet.iter_rows(max_row=1, values_only=True), ())
            header_preview = [
                str(value) if value is not None else "" for value in first_row
            ]

        workbook.close()

        return ExcelUploadResult(
            filename=file.filename,
            sheet_names=sheet_names,
            header_preview=header_preview,
            size_bytes=len(payload),
            normalized_rows=normalized_rows,
        )
