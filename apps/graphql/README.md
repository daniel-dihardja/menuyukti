# GraphQL service

A minimal starter for the Strawberry GraphQL endpoint. The service currently exposes the schema from
`apps/graphql/schema` and can be launched with `uvicorn server:app` (see the Makefile for shortcuts).

## Analytics and the `menuyukti` package

Keep this app **light**: resolvers should load data, enforce ownership/auth, and map results to GraphQL types. **Sales and menu analytics** (aggregations, metrics, matrix/heatmap logic, etc.) live in the shared Python package **`packages/menuyukti`** — add new calculations there and call them from here. Database schema and migrations remain in this app; see [`packages/menuyukti/README.md`](../../packages/menuyukti/README.md) for boundaries and layout.

## Database schema (for AWS/SQLAlchemy testing)

1. Install dependencies with `make install` (`uv sync --all-groups`, including Ruff and mypy) or your normal workflow.
2. Set `DATABASE_URL` in `apps/graphql/.env` (the module loads that file automatically via `python-dotenv`). If you already have a Neon URL, paste it directly there instead of re-exporting the variable every time.
3. Run `make migrate-db` (or `DATABASE_URL="..." make migrate-db` if you need to override the `.env`) to create the analytics tables defined in `apps/graphql/data_sources/database.py`; `DATABASE_URL` now comes from `.env`, so no extra flags are required.
4. The script falls back to the on-disk SQLite file (`sqlite+pysqlite:///./graphql.db`) when the env var is missing, keeping the workflow safe for quick local tests.
5. After the tables exist, import `SessionLocal` from `graphql.data_sources` inside your resolvers to read or write Neon rows via SQLAlchemy sessions.

**Existing databases** (already created before a schema change): `make migrate-db` only runs `create_all` and does not add columns. To align an older `node` table with the current models, run:

```sql
ALTER TABLE node ADD COLUMN type TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE node ADD COLUMN location_id INTEGER REFERENCES location(id);
CREATE INDEX IF NOT EXISTS ix_node_location_id ON node(location_id);
CREATE INDEX IF NOT EXISTS ix_node_location_type ON node(location_id, type);
```

Export snapshots for workflow roots are stored in the **`workflow`** table (`make migrate-db` / `create_all`).

Need a clean slate? Run `make drop-db` (or `uv run python -m graphql.data_sources.database drop`) to drop every table before recreating the schema with `make migrate-db`.  
To import a specific Excel report directly into `order_fact`, run `make load-report REPORT_PATH=../../reports/Sales_Recapitulation_Detail_Report_Test.xlsx`; this drops/recreates the database, normalizes the specified workbook with Menyukti, and loads the rows so the analytics schema mirrors that report.

### Dev data (Excel + COGS)

To populate the dev database with the Jan–Mar 2025 report and menu COGS for manual or explorative testing, run `make dev-data` from `apps/graphql`. This uses `reports/Sales_Recapitulation_Detail_Report_Jan-Mar_2025.xlsx` and `notebooks/data/menu_cogs.json` by default; ensure those files exist, or pass `--excel` / `--cogs` when running the script directly. From the repo root: `make -C apps/graphql dev-data`.

The seeded `Location` row gets `clerk_user_id` from `DEV_CLERK_USER_ID` (or `--clerk-user-id` on the script), defaulting to `dev_local_user`. **Set `DEV_CLERK_USER_ID` to your Clerk user id** (the same value the web app sends as `X-User-Id`) so GraphQL ownership checks allow the location, analytics runs, and related data to appear when you are signed in. Example: `DEV_CLERK_USER_ID=user_xxx make dev-data`.

## Orders fact schema (next step)

The normalized upload mutation now feeds a dedicated Orders fact table (`apps/graphql/data_sources/database.py::OrderFact`). Each record captures the `POSTransactionLineItem` contract, plus a `pos_system` column so you can trace the ingestion source. The column definitions are:

| Column                      | Type         | Notes                             |
| --------------------------- | ------------ | --------------------------------- |
| `id`                        | integer (PK) | Auto-increment surrogate          |
| `bill_number`               | string       | Indexed for join/filter           |
| `menu`                      | string       | Menu item name                    |
| `qty`                       | integer      | Quantity ordered                  |
| `price`                     | float        | Unit price                        |
| `total_after_bill_discount` | float        | Line revenue                      |
| `order_time`                | timestamp    | Indexed for time-series analytics |
| `menu_category`             | string       | Category classification           |
| `menu_category_detail`      | string       | Subcategory/classifier            |
| `pos_system`                | string       | Detected POS (currently `esb`)    |

Running `make migrate-db` (or `DATABASE_URL="..." make migrate-db`) will create this table alongside the other analytics tables. The next step after this is wiring the mutation to persist `NormalizedLineItem` rows into `OrderFact`, then building materialized views or summaries for your downstream analytics/agentic consumers.

## Uploading Excel files

The schema now exposes an `uploadSalesReport(file: Upload!): ExcelUploadResult!` mutation. It reads the file into memory, detects the POS system (ESB today, others in the future), normalizes the rows via Menyukti, persists them into the `order_fact` table, and returns metadata (sheet names/header row, bytes) plus the normalized data.

1. Open a GraphQL client that supports multipart file uploads (Insomnia, Altair, GraphiQL with `graphql-multipart-request-spec`).
2. Issue a mutation such as:

```
mutation UploadFile($file: Upload!) {
  uploadExcel(file: $file) {
    filename
    storedPath
    sheetNames
    headerPreview
    sizeBytes
  }
}
```

3. Attach your Excel file under the `file` variable and run the mutation. The server detects the POS system (ESB today, others in the future), reads the bytes into memory, normalizes the rows, persists them into the analytics table, and returns metadata so you can verify the upload succeeded (no file is stored on disk).
4. The response also includes `normalizedRows`, which mirrors the `POSTransactionLineItem` contract from `menuyukti.core` (fields like `billNumber`, `menu`, `qty`, `price`, `totalAfterBillDiscount`, `orderTime`, `menuCategory`, `menuCategoryDetail`). Use those entries directly in your UI or downstream analytics without additional conversions.
5. Unsupported POS systems return a GraphQL `ValueError` mentioning the detected POS name, so clients can fall back to another workflow until a normalizer is available.

---
