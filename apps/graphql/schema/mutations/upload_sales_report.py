from dataclasses import asdict
from datetime import datetime

import strawberry
from strawberry.file_uploads import Upload
from strawberry.scalars import JSON

from graphql.limits import MAX_SALES_REPORT_UPLOAD_BYTES
from graphql.reports import Order
from graphql.schema.auth import user_id_from_info
from graphql.services.sales_report import ingest_sales_report_upload


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
class OrderItemType:
    menu: str
    qty: int
    price: float
    totalAfterBillDiscount: float
    menuCategory: str
    menuCategoryDetail: str


@strawberry.type
class OrderType:
    billNumber: str
    orderTime: datetime
    items: list[OrderItemType]


@strawberry.type(
    description=(
        "Result of ingesting a sales report Excel file. "
        "Line-level `normalizedRows` and `orders` are omitted unless includeLineItems is true."
    )
)
class ExcelUploadResult:
    filename: str
    sheet_names: list[str]
    header_preview: list[str]
    size_bytes: int
    normalized_rows: list[NormalizedLineItem]
    orders: list[OrderType]
    sales_analytics: JSON


def _order_to_strawberry(order: Order) -> OrderType:
    return OrderType(
        billNumber=order.billNumber,
        orderTime=order.orderTime,
        items=[
            OrderItemType(
                menu=item.menu,
                qty=item.qty,
                price=item.price,
                totalAfterBillDiscount=item.totalAfterBillDiscount,
                menuCategory=item.menuCategory,
                menuCategoryDetail=item.menuCategoryDetail,
            )
            for item in order.items
        ],
    )


@strawberry.type
class UploadSalesReportMutation:
    @strawberry.mutation(
        description=(
            "Upload and normalize a POS sales Excel file, persist order facts, and return metadata "
            "and sales analytics. Set includeLineItems to receive normalizedRows and orders "
            "(large payloads). Upload size is capped by MAX_SALES_REPORT_UPLOAD_BYTES (default 30 MiB)."
        )
    )
    async def upload_sales_report(
        self,
        info: strawberry.Info,
        file: Upload,
        location_id: strawberry.ID,
        include_line_items: bool = False,
    ) -> ExcelUploadResult:
        user_id = user_id_from_info(info)
        payload = await file.read()
        if len(payload) > MAX_SALES_REPORT_UPLOAD_BYTES:
            mb = MAX_SALES_REPORT_UPLOAD_BYTES / (1024 * 1024)
            raise ValueError(
                f"File exceeds maximum upload size ({mb:.0f} MiB). "
                "Raise MAX_SALES_REPORT_UPLOAD_BYTES if you need a higher limit."
            )
        result = ingest_sales_report_upload(
            payload=payload,
            filename=file.filename,
            location_id=int(location_id),
            user_id=user_id,
        )

        if include_line_items:
            normalized_rows = [NormalizedLineItem(**asdict(row)) for row in result.normalized_rows]
            orders = [_order_to_strawberry(o) for o in result.orders]
        else:
            normalized_rows = []
            orders = []

        return ExcelUploadResult(
            filename=result.filename,
            sheet_names=result.sheet_names,
            header_preview=result.header_preview,
            size_bytes=result.size_bytes,
            normalized_rows=normalized_rows,
            orders=orders,
            sales_analytics=result.sales_analytics,
        )
