"""Guard agents chart catalog against drift from the web visualization contract.

Keep these expected values in sync with:
- apps/web/lib/chat/visualization-ids.ts
- apps/web/lib/chat/visualization-contract.ts
"""

from __future__ import annotations

from agents_app.agents.core.chat.chart_data import (
    CHART_IDS,
    CHART_TITLES,
    HEATMAP_MATRIX_CHAT_CATEGORIES,
    MENU_HEATMAP_CHAT_TOP_N,
)

# Mirror of apps/web/lib/chat/visualization-ids.ts CHAT_VISUALIZATION_ID_VALUES
_EXPECTED_CHART_IDS = (
    "venue_slot_strength_heatmap",
    "menu_item_heatmap",
    "pair_lift_matrix_heatmap",
    "low_end_review",
)

# Mirror of apps/web/lib/chat/visualization-contract.ts
_EXPECTED_MENU_HEATMAP_CHAT_TOP_N = 25
_EXPECTED_HEATMAP_MATRIX_CHAT_CATEGORIES = frozenset({"star", "plow_horse", "puzzle"})
_EXPECTED_CHART_TITLES = {
    "venue_slot_strength_heatmap": "Venue slot strength",
    "menu_item_heatmap": "Menu item heatmap",
    "pair_lift_matrix_heatmap": "Pair lift matrix",
    "low_end_review": "Weak items review",
}


def test_chart_ids_match_web_visualization_contract() -> None:
    assert CHART_IDS == _EXPECTED_CHART_IDS


def test_menu_heatmap_top_n_matches_web_visualization_contract() -> None:
    assert MENU_HEATMAP_CHAT_TOP_N == _EXPECTED_MENU_HEATMAP_CHAT_TOP_N


def test_heatmap_matrix_categories_match_web_visualization_contract() -> None:
    assert HEATMAP_MATRIX_CHAT_CATEGORIES == _EXPECTED_HEATMAP_MATRIX_CHAT_CATEGORIES


def test_chart_titles_match_web_visualization_contract() -> None:
    assert CHART_TITLES == _EXPECTED_CHART_TITLES
