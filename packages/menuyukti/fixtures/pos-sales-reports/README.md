# POS sales-report fixtures

Small, committed Excel demos for POS ingest / normalizer work in `menuyukti`.

Every POS workbook encodes the same line items from [`shared/demo-dataset.json`](./shared/demo-dataset.json).

| POS key | Upload support                             | Demo workbook                                                                                      |
| ------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `esb`   | Yes (`Sales Recapitulation Detail Report`) | [`esb/SalesRecapitulationDetailReport_DEMO.xlsx`](./esb/SalesRecapitulationDetailReport_DEMO.xlsx) |
| `moka`  | Yes (Moka **Export Item Details**)         | [`moka/ItemDetails_DEMO.xlsx`](./moka/ItemDetails_DEMO.xlsx)                                       |
| `quino` | Yes                                        | Use a live dump under `/reports/quino/` (not committed here)                                       |

Moka columns mirror Backoffice **Export Item Details** (payment + line-item fields). Shared `menu_category_detail` is stored in **Variant Name** so ESB and Moka demos keep identical analytics data. Detection: A1 contains `item details`; header row 4 (`skiprows=3`).

Large real vendor dumps stay local under gitignored `/reports/` — do not commit them here.

## Regenerate

From the repo root (after `uv sync`):

```bash
uv run python packages/menuyukti/fixtures/pos-sales-reports/scripts/generate_pos_demos.py
```

Or from this package:

```bash
make generate-pos-demos
```

## Add another POS

1. Keep or extend `shared/demo-dataset.json` (one shared story).
2. Add a writer in `scripts/generate_pos_demos.py` that maps shared fields into that POS layout.
3. Write the workbook under `<pos>/…_DEMO.xlsx`.
4. Register detection + normalizer in `pos_mapping` / `registry`, and add unit tests that read the new fixture.
