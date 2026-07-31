"""Composite analytics read: one OrderFact load for multiple report sections."""

from __future__ import annotations

import strawberry

from graphql.context import request_session_scope
from graphql.schema.auth import get_analytics_run_if_owner, user_id_from_info
from graphql.schema.mappers.analytics_run import order_metrics_to_gql
from graphql.schema.mappers.category_mix import category_mix_to_gql
from graphql.schema.mappers.menu_engineering_matrix import matrix_data_to_gql
from graphql.schema.queries.menu_heatmaps import MenuHeatmapType, menu_heatmaps_to_gql
from graphql.schema.types.category_mix import CategoryMixPayloadType
from graphql.schema.types.menu_engineering_matrix import MenuEngineeringMatrixType
from graphql.schema.types.order_metrics import AnalyticsRunOrderMetricsType
from graphql.services.analytics_bundle import AnalyticsBundleOptions, build_analytics_bundle
from graphql.services.compute_limits import compute_timeout


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
        with request_session_scope(info) as session:
            run = get_analytics_run_if_owner(
                session,
                int(analytics_run_id),
                user_id,
                info=info,
                location_id=int(location_id) if location_id is not None else None,
            )
            if run is None:
                return None

            bundle_options = AnalyticsBundleOptions(
                include_order_metrics=opts.include_order_metrics,
                include_menu_engineering_matrix=opts.include_menu_engineering_matrix,
                include_menu_heatmaps=opts.include_menu_heatmaps,
                include_category_mix=opts.include_category_mix,
            )

            with compute_timeout():
                data = build_analytics_bundle(session, run, bundle_options, info=info)

            return AnalyticsBundleType(
                analytics_run_id=strawberry.ID(str(data.analytics_run_id)),
                order_metrics=(
                    order_metrics_to_gql(data.order_metrics)
                    if data.order_metrics is not None
                    else None
                ),
                menu_engineering_matrix=(
                    matrix_data_to_gql(data.menu_engineering_matrix)
                    if data.menu_engineering_matrix is not None
                    else None
                ),
                menu_heatmaps=(
                    menu_heatmaps_to_gql(data.menu_heatmaps)
                    if data.menu_heatmaps is not None
                    else None
                ),
                category_mix=(
                    category_mix_to_gql(data.category_mix)
                    if data.category_mix is not None
                    else None
                ),
            )
