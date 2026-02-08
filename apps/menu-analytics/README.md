# Menuyukti Analytics API

This service is the deterministic analytics layer for Menuyukti. It ingests POS exports (currently ESB Excel), normalizes the data, and produces structured analytics used by the app and downstream intelligence components.

## What This API Does

- Detects POS format from uploaded Excel files
- Normalizes raw POS exports into clean, typed tables
- Computes menu analytics such as:
  - sales summary metrics
  - popularity index per menu item
  - hourly and weekly demand heatmaps
  - menu engineering matrix and portfolio distribution
- Returns JSON-ready outputs for the web app and agents

## Core Analytics Flow

1. Upload Excel bytes
2. Detect POS format
3. Normalize to a standard schema
4. Run analytics calculations
5. Return structured results

## Key Modules

- `app/analytics/pos_detector.py` — POS detection
- `app/analytics/esb/normalizer.py` — ESB Excel normalization
- `app/analytics/calculate_sales_analytics.py` — summary analytics + heatmaps + popularity
- `app/analytics/calculate_menu_engineering_matrix.py` — menu engineering outputs

## Run Tests

```bash
cd apps/menu-analytics
uv run pytest
```
