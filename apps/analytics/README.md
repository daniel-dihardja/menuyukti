# Menuyukti Analytics API

This service is the deterministic analytics layer for Menuyukti. It ingests POS exports (currently ESB Excel), normalizes the data, and produces structured analytics used by the app and downstream feature components.

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

- `app/main.py` — API entrypoint and route handlers
- `menuyukti.core.analytics.pos_detector` — POS detection
- `menuyukti.core.analytics.esb.normalizer` — ESB Excel normalization
- `menuyukti.core.analytics.calculate_sales_analytics` — summary analytics + heatmaps + popularity
- `menuyukti.core.analytics.calculate_menu_engineering_matrix` — menu engineering outputs

## Run Tests

```bash
cd apps/analytics
uv run pytest
```
