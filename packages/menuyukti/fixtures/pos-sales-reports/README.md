# POS sales-report fixtures

Small, committed Excel demos for POS ingest / normalizer work in `menuyukti`.

Every POS workbook encodes the same line items from [`shared/demo-dataset.json`](./shared/demo-dataset.json).

| POS   | Demo workbook                                                                                      |
| ----- | -------------------------------------------------------------------------------------------------- |
| `esb` | [`esb/SalesRecapitulationDetailReport_DEMO.xlsx`](./esb/SalesRecapitulationDetailReport_DEMO.xlsx) |

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
