# GraphQL service

A minimal starter for the Strawberry GraphQL endpoint. The service currently exposes the schema from
`apps/graphql/schema` and can be launched with `uvicorn server:app` (see the Makefile for shortcuts).

## Database schema (for AWS/SQLAlchemy testing)

1. Install dependencies with `uv sync` or your normal workflow.
2. Set `DATABASE_URL` in `apps/graphql/.env` (the module loads that file automatically via `python-dotenv`). If you already have a Neon URL, paste it directly there instead of re-exporting the variable every time.
3. Run `make migrate-db` (or `DATABASE_URL="..." make migrate-db` if you need to override the `.env`) to create the `users` table defined in `apps/graphql/data_sources/database.py`; `DATABASE_URL` now comes from `.env`, so no extra flags are required.
4. The script falls back to the on-disk SQLite file (`sqlite+pysqlite:///./graphql.db`) when the env var is missing, keeping the workflow safe for quick local tests.
5. After the table exists, import `SessionLocal`/`User` from `apps.graphql.data_sources` inside your resolvers to read or write Neon rows via SQLAlchemy sessions.
