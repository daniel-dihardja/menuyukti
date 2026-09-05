# GraphQL service

A minimal starter for the Strawberry GraphQL endpoint. The service currently exposes the schema from
`apps/graphql/schema` and can be launched with `uvicorn server:app` (see the Makefile for shortcuts).

## Security and query limits

**Trust model.** The API is intended for **server-to-server** use from the Next.js app (or other trusted callers). When `INTERNAL_API_KEY` (or `GRAPHQL_INTERNAL_API_KEY`) is set in the environment, [`server.py`](./server.py) requires matching header `X-Internal-Api-Key` on every request **except** CRM customer routes under `/crm/v1/` (passwordless enroll + device auth). In **production** (`GRAPHQL_ENV` / `ENV` / `VERCEL_ENV` / `NODE_ENV=production`, or `GRAPHQL_REQUIRE_INTERNAL_API_KEY=1`), startup **fails** if neither key is set. The authenticated Clerk user is passed as **`X-User-Id`**; the GraphQL layer **trusts** that value after the internal key gate. Do not expose this endpoint directly to browsers without a gateway that validates callers. Rotate `INTERNAL_API_KEY` if it may have leaked.

**Public catalog reads.** `publicHolidays` is intentionally unauthenticated (static holiday JSON).

**CRM customer JWT.** Device access tokens are HS256 JWTs signed with **`CRM_JWT_SECRET`** (required, at least 32 characters). Set it in `apps/graphql/.env` for local runs. Claims: `sub` (customer UUID), `did` (device UUID), `app_id` (public CRM app UUID), `exp` (~15 minutes). Refresh tokens are opaque secrets stored as SHA-256 hashes on `crm_device`.

**Query protections.** The schema enables depth, alias count, token count, and maximum field-selection limits (see [`limits.py`](./limits.py) and [`schema/__init__.py`](./schema/__init__.py)). Oversized documents fail validation before execution.

**Pagination.** `nodes` accepts optional `first` (default 500, max 500) and `afterId` (last-seen node id) when listing by location without `parentId`; pages are ordered by **id descending** (typically newest-first with serial PKs). With `parentId`, results are truncated to `first`. `analyticsRuns` accepts optional `first` (default 100, max 300).

**Uploads.** `uploadSalesReport` rejects files larger than `MAX_SALES_REPORT_UPLOAD_BYTES` (default 30 MiB). Line-level `normalizedRows` and `orders` are returned only when **`includeLineItems`** is true; otherwise the mutation still ingests data but omits those large fields in the response.

## Analytics and the `menuyukti` package

Keep this app **light**: resolvers should load data, enforce ownership/auth, and map results to GraphQL types. **Sales and menu analytics** (aggregations, metrics, matrix/heatmap logic, etc.) live in the shared Python package **`packages/menuyukti`** — add new calculations there and call them from here. Database schema and migrations remain in this app; see [`packages/menuyukti/README.md`](../../packages/menuyukti/README.md) for boundaries and layout.

## Database schema and migrations (Alembic)

Schema changes are **versioned** under [`alembic/`](./alembic/) (revision scripts in `alembic/versions/`). Production and shared PostgreSQL databases should use Alembic, not ad-hoc `ALTER` scripts, for DDL.

1. Install dependencies with `make install` (`uv sync --all-groups`, including Ruff and mypy) or your normal workflow.
2. Set `DATABASE_URL` in `apps/graphql/.env` (loaded by `python-dotenv` in `graphql.data_sources.database` and Alembic `env.py`). Use a PostgreSQL URL, e.g. `postgresql+psycopg2://user:pass@host:5432/dbname`.
3. Apply migrations: `make db-upgrade` (or `PYTHONPATH=../.. uv run alembic upgrade head` from `apps/graphql`).
4. After a model change, generate a revision: `make db-generate MSG=short_description`, then review the file under `alembic/versions/`, run `make db-upgrade`, and commit the new revision.
5. **Existing databases** that were created with `create_all` before Alembic: if `make db-upgrade` fails with **DuplicateTable** (tables exist but Alembic has no version), the live schema likely already matches an older revision. Stamp that revision, then upgrade:
   ```bash
   make db-current          # often empty
   make db-stamp REV=r7s8t9u0v1w2   # last revision before your pending migration(s)
   make db-upgrade          # applies only newer revisions
   ```
   Use `make db-stamp-head` only when you have verified the schema already matches **head** and must not re-run any DDL. For a clean PostgreSQL database: `make drop-db` then `make db-upgrade` (destructive).

The app still falls back to the on-disk SQLite file (`sqlite+pysqlite:///./graphql.db`) when `DATABASE_URL` is unset (handy for quick local runs). The pytest suite forces a SQLite test DB in `tests/conftest.py` and uses `create_all` — it does not run Alembic.

Import `SessionLocal` from `graphql.data_sources` inside resolvers to read or write rows via SQLAlchemy sessions.

### Media library catalog

Workspace photos stay as flat S3 objects under `workspaces/<id>/photos/`. GraphQL `media_asset` / `media_collection` tables catalog and group them. After deploying the media-collections migration, existing S3 photos can be indexed once via the web BFF: `POST /api/media/backfill` (authenticated workspace member). New uploads call `ensureMediaAsset` automatically.

**Legacy one-off SQL** (only if you still have a pre–Alembic database that never ran migrations): to align an older `node` table manually, you could run:

```sql
ALTER TABLE node ADD COLUMN type TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE node ADD COLUMN location_id INTEGER REFERENCES location(id);
CREATE INDEX IF NOT EXISTS ix_node_location_id ON node(location_id);
CREATE INDEX IF NOT EXISTS ix_node_location_type ON node(location_id, type);
```

### Generic `Node` rows

The polymorphic **`node`** table (`type` + JSON `data`) remains for entities that still use it. Prefer dedicated tables (e.g. calendar entries, media) for new features. **Workflow-container / milestone export-import are not live product APIs** — see [`packages/docs/menuyukti/remove-milestones.md`](../../packages/docs/menuyukti/remove-milestones.md) for cleanup history.

Need a clean slate on PostgreSQL? Run `make drop-db` (destructive: drops `public` schema), then `make db-upgrade`. For local SQLite only, you can also use `uv run python -m graphql.data_sources.database` for `create_all` (not used for production Postgres).  
To import a specific Excel report directly into `order_fact`, run `make load-report REPORT_PATH=../../reports/Sales_Recapitulation_Detail_Report_Test.xlsx`; this drops/recreates the database, normalizes the specified workbook with Menyukti, and loads the rows so the analytics schema mirrors that report.

### Dev data (selective seed)

`make dev-data` **does not wipe the database**. It seeds into the workspace for your Clerk user and leaves CRM, media, styles, and other tables alone.

**Clerk user id is required:** pass `USER_ID=...` on the make command, or export `DEV_CLERK_USER_ID`. Use the same id as the signed-in web user (`X-User-Id`).

| Command | What it does |
| -------- | ------------- |
| `make dev-data USER_ID=user_xxx` | Default `SCOPE=inventar`: reset inventar for that workspace, seed catalog/stock/movements, ensure `SNABB` + `SNABB Branch` |
| `make dev-data SCOPE=analytics USER_ID=user_xxx EXCEL=/path/to/report.xlsx` | Replace only `dev-seed-*` analytics runs; upsert location COGS; load order facts |
| `make dev-data SCOPE=all USER_ID=user_xxx EXCEL=/path/to/report.xlsx` | Inventar + analytics |
| `make db-reset-dev` | Destructive: `drop-db` + `db-upgrade` (Alembic) |
| `make db-reset-dev SEED=1 USER_ID=user_xxx` | Hard schema reset, then inventar seed |

Optional: `COGS=/path/to/menu_cogs.json` (defaults to `notebooks/data/menu_cogs.json` when present). The default Excel under `reports/` is **gitignored** — pass `EXCEL=` for analytics scopes.

When a primary location is created for the first time, the script also adds weekday opening hours and a sample `location_manual_brief_input` (not overwritten on later runs).

From the repo root: `make -C apps/graphql dev-data USER_ID=user_xxx`.

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

Running `make db-upgrade` with `DATABASE_URL` set will create this table alongside the other analytics tables via Alembic. The next step after this is wiring the mutation to persist `NormalizedLineItem` rows into `OrderFact`, then building materialized views or summaries for your downstream analytics/agentic consumers.

## Uploading Excel files

The schema exposes `uploadSalesReport(file: Upload!, locationId: ID!, includeLineItems: Boolean = false): ExcelUploadResult!`. It reads the file into memory (subject to `MAX_SALES_REPORT_UPLOAD_BYTES`), detects the POS system (ESB today, others in the future), normalizes the rows via Menyukti, persists them into the `order_fact` table, and returns metadata (sheet names/header row, bytes) and `salesAnalytics`. Set **`includeLineItems: true`** only when the client needs `normalizedRows` and `orders` in the response (large payloads).

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
