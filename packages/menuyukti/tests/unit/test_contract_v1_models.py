from datetime import date

from menuyukti.core.contracts.v1 import (
    MatrixDistributionV1,
    MenuHeatmapV1,
    SalesAnalyticsSummaryV1,
)


def test_menu_heatmap_v1_accepts_legacy_aliases():
    payload = {
        "menu": "Latte",
        "menuCategory": "DRINK",
        "menuCategoryDetail": "COFFEE",
        "dailyHeatmap": [{"hour": "08", "quantity": 3}],
        "weeklyHeatmap": [{"day": "mon", "quantity": 10}],
    }

    model = MenuHeatmapV1(**payload)
    assert model.menu_category == "DRINK"
    assert model.menu_category_detail == "COFFEE"
    assert model.daily_heatmap[0].hour == 8


def test_matrix_distribution_v1_accepts_legacy_aliases():
    payload = {
        "categories": [
            {
                "category": "star",
                "count": 4,
                "percentage": 0.4,
                "margin_contribution_percentage": 0.55,
            }
        ]
    }

    model = MatrixDistributionV1(**payload)
    assert model.categories[0].item_count == 4
    assert model.categories[0].item_share == 0.4
    assert model.categories[0].margin_share == 0.55


def test_sales_summary_v1_accepts_avg_popularity_alias():
    payload = {
        "total_orders": 5,
        "total_items_sold": 12,
        "total_revenue": 123.0,
        "avg_order_revenue": 20.5,
        "max_order_revenue": 40.0,
        "min_order_revenue": 5.0,
        "avg_order_items": 2.4,
        "max_order_items": 5,
        "min_order_items": 1,
        "avg_popularity": 0.4,
        "popularity_index": [],
        "period_start": "2025-02-01",
        "period_end": "2025-02-28",
    }

    model = SalesAnalyticsSummaryV1(**payload)
    assert model.avg_popularity_threshold == 0.4
    assert model.period_start == date(2025, 2, 1)
