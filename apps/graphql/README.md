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

3. Attach your Excel file under the `file` variable and run the mutation. The server persists the file and returns the captured metadata so you can verify the upload succeeded.
