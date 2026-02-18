from menuyukti.core.contracts.adapters import (
    to_core_distribution,
    to_core_heatmap,
    to_core_matrix_item,
)


def test_to_core_heatmap_accepts_legacy_shape():
    payload = {
        "menu": "Latte",
        "menuCategory": "DRINK",
        "menuCategoryDetail": "COFFEE",
        "dailyHeatmap": [{"hour": "08", "quantity": 3}],
        "weeklyHeatmap": [{"day": "mon", "quantity": 5}],
    }

    model = to_core_heatmap(payload)
    assert model.menu_category == "DRINK"
    assert model.daily_heatmap[0].hour == 8
    assert model.reporting_period == "unknown"


def test_to_core_distribution_accepts_legacy_shape():
    payload = {
        "categories": [
            {
                "category": "star",
                "count": 2,
                "percentage": 0.5,
                "margin_contribution_percentage": 0.6,
            }
        ]
    }

    model = to_core_distribution(payload)
    assert model.categories[0].item_count == 2
    assert model.categories[0].item_share == 0.5
    assert model.categories[0].margin_share == 0.6


def test_to_core_matrix_item_round_trip():
    payload = {
        "menu": "Latte",
        "menu_category": "DRINK",
        "menu_category_detail": "COFFEE",
        "category": "star",
        "action": "keep",
        "quantity": 10,
        "total_revenue": 100.0,
        "cogs": 2.0,
        "total_cogs": 20.0,
        "margin_per_unit": 8.0,
        "contribution_margin": 80.0,
        "contribution_margin_percentage": 0.2,
        "we_value": 0.4,
    }

    model = to_core_matrix_item(payload)
    assert model.menu == "Latte"
    assert model.total_revenue == 100.0
