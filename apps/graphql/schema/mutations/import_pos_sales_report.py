"""Import paid Menuyukti POS tickets into a new analytics run."""

from __future__ import annotations

from datetime import date

import strawberry

from graphql.context import request_session_scope
from graphql.schema.auth import user_id_from_info
from graphql.services.pos_sales_import import ingest_pos_sales_range


@strawberry.type
class ImportPosSalesReportResult:
    analytics_run_id: strawberry.ID
    name: str
    order_count: int
    line_count: int


@strawberry.type
class ImportPosSalesReportMutation:
    @strawberry.mutation(
        description=(
            "Create a new analytics run from paid Menuyukti POS tickets in an inclusive "
            "UTC date range. Always creates a new run (duplicates allowed)."
        )
    )
    def import_pos_sales_report(
        self,
        info: strawberry.Info,
        location_id: strawberry.ID,
        start_date: date,
        end_date: date,
    ) -> ImportPosSalesReportResult:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for importPosSalesReport")

        try:
            loc_pk = int(str(location_id))
        except ValueError as e:
            raise ValueError("Invalid location id") from e
        if loc_pk < 1:
            raise ValueError("Invalid location id")

        with request_session_scope(info) as session:
            result = ingest_pos_sales_range(
                session,
                location_id=loc_pk,
                user_id=user_id,
                start_date=start_date,
                end_date=end_date,
            )
            session.commit()
            return ImportPosSalesReportResult(
                analytics_run_id=strawberry.ID(str(result.analytics_run_id)),
                name=result.name,
                order_count=result.order_count,
                line_count=result.line_count,
            )
