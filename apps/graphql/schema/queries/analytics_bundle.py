"""Composite analytics read: one OrderFact load for multiple report sections."""

from __future__ import annotations

import strawberry

from graphql.data_sources import SessionLocal
from graphql.schema.auth import get_analytics_run_if_owner, user_id_from_info
from graphql.schema.queries.analytics_run import (
    AnalyticsRunOrderMetricsType,
    _compute_order_metrics,
)
from graphql.schema.queries.category_mix import CategoryMixPayloadType, CategoryMixRowGqlType
from graphql.schema.queries.menu_engineering_matrix import (
    MenuEngineeringMatrixType,
    _matrix_data_to_gql,
)
from graphql.schema.queries.menu_heatmaps import MenuHeatmapType, _compute_menu_heatmaps_for_run
from graphql.services.category_mix import build_category_mix
from graphql.services.compute_limits import compute_timeout
from graphql.services.menu_engineering import compute_menu_engineering_matrix


@strawberry.input(description="Select which analytics sections to include in the bundle.")
class AnalyticsBundleOptionsInput:
    include_order_metrics: bool = True
    include_menu_engineering_matrix: bool = True
    include_menu_heatmaps: bool = True
    include_category_mix: bool = True


@strawberry.type(description="Multiple analytics computations from a single order-fact load.")
class AnalyticsBundleType:
    analytics_run_id: strawberry.ID
    order_metrics: AnalyticsRunOrderMetricsType | None = None
    menu_engineering_matrix: MenuEngineeringMatrixType | None = None
    menu_heatmaps: list[MenuHeatmapType] | None = None
    category_mix: CategoryMixPayloadType | None = None


def _category_mix_to_gql(raw: dict) -> CategoryMixPayloadType:
    return CategoryMixPayloadType(
        analytics_run_id=strawberry.ID(str(raw["analytics_run_id"])),
        top_revenue_category=raw.get("top_revenue_category"),
        rows=[
            CategoryMixRowGqlType(
                category=r.get("category"),
                revenue=float(r["revenue"]),
                quantity=int(r["quantity"]),
                revenue_share=float(r["revenue_share"]),
                quantity_share=float(r["quantity_share"]),
                top_item=str(r["top_item"]),
            )
            for r in raw["rows"]
        ],
    )


@strawberry.type
class AnalyticsBundleQuery:
    @strawberry.field(
        description=(
            "Return multiple analytics sections for one run using a shared OrderFact load. "
            "Use options to omit sections you do not need."
        )
    )
    def analytics_bundle(
        self,
        info: strawberry.Info,
        analytics_run_id: strawberry.ID,
        location_id: strawberry.ID | None = None,
        options: AnalyticsBundleOptionsInput | None = None,
    ) -> AnalyticsBundleType | None:
        user_id = user_id_from_info(info)
        opts = options or AnalyticsBundleOptionsInput()
        with SessionLocal() as session:
            run = get_analytics_run_if_owner(session, int(analytics_run_id), user_id, info=info)
            if run is None:
                return None
            if location_id is not None and run.location_id != int(location_id):
                return None

            order_metrics: AnalyticsRunOrderMetricsType | None = None
            matrix: MenuEngineeringMatrixType | None = None
            heatmaps: list[MenuHeatmapType] | None = None
            category_mix: CategoryMixPayloadType | None = None

            with compute_timeout():
                if opts.include_order_metrics:
                    order_metrics = _compute_order_metrics(session, run, info=info)
                if opts.include_menu_engineering_matrix:
                    matrix_data = compute_menu_engineering_matrix(session, run, info=info)
                    if matrix_data is not None:
                        matrix = _matrix_data_to_gql(matrix_data)
                if opts.include_menu_heatmaps:
                    heatmaps = _compute_menu_heatmaps_for_run(session, run, info=info)
                if opts.include_category_mix:
                    raw_cat = build_category_mix(session, run, info=info)
                    if raw_cat is not None:
                        category_mix = _category_mix_to_gql(raw_cat)

            return AnalyticsBundleType(
                analytics_run_id=strawberry.ID(str(run.id)),
                order_metrics=order_metrics,
                menu_engineering_matrix=matrix,
                menu_heatmaps=heatmaps,
                category_mix=category_mix,
            )
