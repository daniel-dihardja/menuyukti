import json
from pathlib import Path

import pandas as pd

from menuyukti.core.analytics.calculate_menu_engineering_matrix import (
    calculate_menu_engineering_matrix,
)
from menuyukti.core.analytics.calculate_sales_analytics import calculate_sales_analytics
from menuyukti.core.analytics.extract_menu_items import extract_menu_items
from menuyukti.core.contracts.adapters import (
    to_core_distribution,
    to_core_heatmap,
    to_core_matrix_item,
    to_core_sales_summary,
    to_menu_matrix_envelope_v1,
    to_sales_analytics_envelope_v1,
)
from menuyukti.core.inputs import CoreInputs


FIXTURES = Path(__file__).resolve().parents[2] / "fixtures" / "analytics"


def _load_sales_rows():
    return json.loads((FIXTURES / "sales_rows.json").read_text())


def test_end_to_end_contract_to_core_inputs_flow():
    sales_df = pd.DataFrame(_load_sales_rows())
    extracted_items = pd.DataFrame(extract_menu_items(sales_df))
    cogs_by_menu = {
        "Latte": 3.0,
        "Bagel": 2.0,
        "Muffin": 1.5,
    }
    matrix_df = extracted_items.assign(cogs=extracted_items["menu"].map(cogs_by_menu))

    sales_result = calculate_sales_analytics(sales_df)
    matrix_result = calculate_menu_engineering_matrix(matrix_df)

    sales_envelope = to_sales_analytics_envelope_v1(sales_result)
    matrix_envelope = to_menu_matrix_envelope_v1(matrix_result, source_system="matrix")
    matrix_menu_names = {
        item["menu"] for item in matrix_envelope.payload.model_dump()["items"]
    }

    core = CoreInputs(
        matrix_items=[
            to_core_matrix_item(item)
            for item in matrix_envelope.payload.model_dump()["items"]
        ],
        heatmaps=[
            to_core_heatmap(
                payload=heatmap,
                period_start=sales_envelope.payload.period_start,
            )
            for heatmap in sales_envelope.payload.model_dump()["menu_heatmaps"]
            if heatmap["menu"] in matrix_menu_names
        ],
        distribution=to_core_distribution(
            {"categories": matrix_envelope.payload.model_dump()["distribution"]}
        ),
        sales_summary=to_core_sales_summary(sales_envelope.payload.model_dump()),
    )

    assert core.sales_summary is not None
    assert core.sales_summary.total_orders == 4

    # Core input normalization guarantees deterministic ordering for consumers.
    assert [item.menu for item in core.matrix_items] == sorted(
        [item.menu for item in core.matrix_items],
        key=str.lower,
    )
    assert [heatmap.menu for heatmap in core.heatmaps] == sorted(
        [heatmap.menu for heatmap in core.heatmaps],
        key=str.lower,
    )
