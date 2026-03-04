# GraphQL service

A minimal starter for the Strawberry GraphQL endpoint. The service currently exposes the schema from
`apps/graphql/schema` and can be launched with `uvicorn server:app` (see the Makefile for shortcuts).

## Database schema (for AWS/SQLAlchemy testing)

1. Install dependencies with `uv sync` or your normal workflow.
2. Set `DATABASE_URL` in `apps/graphql/.env` (the module loads that file automatically via `python-dotenv`). If you already have a Neon URL, paste it directly there instead of re-exporting the variable every time.
3. Run `make migrate-db` (or `DATABASE_URL="..." make migrate-db` if you need to override the `.env`) to create the `users` table defined in `apps/graphql/data_sources/database.py`; `DATABASE_URL` now comes from `.env`, so no extra flags are required.
4. The script falls back to the on-disk SQLite file (`sqlite+pysqlite:///./graphql.db`) when the env var is missing, keeping the workflow safe for quick local tests.
5. After the table exists, import `SessionLocal`/`User` from `apps.graphql.data_sources` inside your resolvers to read or write Neon rows via SQLAlchemy sessions.

Need a clean slate? Run `make drop-db` (or `uv run python -m apps.graphql.data_sources.database drop`) to drop every table before recreating the schema with `make migrate-db`.

## Orders fact schema (next step)

The normalized upload mutation now feeds a dedicated Orders fact table (`apps/graphql/data_sources/database.py::OrderFact`). Each record captures the `POSTransactionLineItem` contract, plus a `pos_system` column so you can trace the ingestion source. The column definitions are:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | integer (PK) | Auto-increment surrogate |
| `bill_number` | string | Indexed for join/filter |
| `menu` | string | Menu item name |
| `qty` | integer | Quantity ordered |
| `price` | float | Unit price |
| `total_after_bill_discount` | float | Line revenue |
| `order_time` | timestamp | Indexed for time-series analytics |
| `menu_category` | string | Category classification |
| `menu_category_detail` | string | Subcategory/classifier |
| `pos_system` | string | Detected POS (currently `esb`) |

Running `make migrate-db` (or `DATABASE_URL="..." make migrate-db`) will create this table alongside the existing `users` table. The next step after this is wiring the mutation to persist `NormalizedLineItem` rows into `OrderFact`, then building materialized views or summaries for your downstream analytics/agentic consumers.

## Uploading Excel files

The schema now exposes an `uploadExcel(file: Upload!): ExcelUploadResult!` mutation. It stores the uploaded workbook in `apps/graphql/uploads`, captures sheet names and the first row of the first sheet, and returns metadata (`filename`, `storedPath`, `sheetNames`, `headerPreview`, `sizeBytes`). To test:

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
