from tests.helpers.audience_contract import (
    EXPECTED_AUDIENCE_OUTPUTS,
    load_audience_core_input_fixture,
)


def test_audience_fixture_contains_required_core_input_sections() -> None:
    payload = load_audience_core_input_fixture()

    assert "matrix_items" in payload
    assert "heatmaps" in payload
    assert "distribution" in payload
    assert "sales_summary" in payload


def test_audience_expected_outputs_are_unique() -> None:
    assert len(EXPECTED_AUDIENCE_OUTPUTS) == len(set(EXPECTED_AUDIENCE_OUTPUTS))


def test_audience_sales_summary_has_required_fields() -> None:
    payload = load_audience_core_input_fixture()
    sales_summary = payload["sales_summary"]
    required_fields = [
        "total_orders",
        "total_items_sold",
        "total_revenue",
        "avg_order_revenue",
        "max_order_revenue",
        "min_order_revenue",
        "avg_order_items",
        "max_order_items",
        "min_order_items",
        "avg_popularity",
        "popularity_index",
        "period_start",
        "period_end",
    ]

    for field in required_fields:
        assert field in sales_summary
