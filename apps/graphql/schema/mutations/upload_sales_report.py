from dataclasses import asdict
from datetime import datetime

import strawberry
from strawberry.file_uploads import Upload
from strawberry.scalars import JSON

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


@strawberry.type
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
    @strawberry.mutation
    async def upload_sales_report(
        self,
        info: strawberry.Info,
        file: Upload,
        location_id: strawberry.ID,
    ) -> ExcelUploadResult:
        user_id = user_id_from_info(info)
        payload = await file.read()
        result = ingest_sales_report_upload(
            payload=payload,
            filename=file.filename,
            location_id=int(location_id),
            user_id=user_id,
        )

        normalized_rows = [NormalizedLineItem(**asdict(row)) for row in result.normalized_rows]
        orders = [_order_to_strawberry(o) for o in result.orders]

        return ExcelUploadResult(
            filename=result.filename,
            sheet_names=result.sheet_names,
            header_preview=result.header_preview,
            size_bytes=result.size_bytes,
            normalized_rows=normalized_rows,
            orders=orders,
            sales_analytics=result.sales_analytics,
        )
