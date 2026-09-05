PYTHON=uv run python
UV=uv run
UVICORN=uv run uvicorn
ALEMBIC=PYTHONPATH=../.. uv run alembic

.PHONY: install run dev db-upgrade db-downgrade db-generate db-history db-current db-stamp db-stamp-head db-check drop-db db-reset-dev test test-qa test-upload test-order-metrics test-menu-item-cogs test-menu-heatmaps test-menu-engineering-matrix load-report dev-data lint format typecheck clean

install:
	uv sync --all-groups

run:
	PYTHONPATH=../.. $(UVICORN) graphql.server:app --host 0.0.0.0 --port 8000

dev:
	PYTHONPATH=../.. $(UVICORN) graphql.server:app --reload --host 0.0.0.0 --port 8000

# --- Database migrations (Alembic; set DATABASE_URL, e.g. postgresql+psycopg2://...) ---
db-upgrade:
	$(ALEMBIC) upgrade head

db-downgrade:
	$(ALEMBIC) downgrade -1

db-generate:
	@if [ -z "$(MSG)" ]; then echo "MSG is required: make db-generate MSG=add_column_to_users"; exit 1; fi
	$(ALEMBIC) revision --autogenerate -m "$(MSG)"

db-history:
	$(ALEMBIC) history --verbose

db-current:
	$(ALEMBIC) current

# Mark the DB at a revision without running DDL (existing create_all DBs). Example:
#   make db-stamp REV=r7s8t9u0v1w2 && make db-upgrade
db-stamp:
	@if [ -z "$(REV)" ]; then echo "REV is required: make db-stamp REV=r7s8t9u0v1w2"; exit 1; fi
	$(ALEMBIC) stamp $(REV)

db-stamp-head:
	$(ALEMBIC) stamp head

db-check:
	$(ALEMBIC) check

# Destructive: drops public schema on PostgreSQL (see graphql.data_sources.database).
drop-db:
	PYTHONPATH=../.. $(PYTHON) -m graphql.data_sources.database drop

test-upload:
	PYTHONPATH=../.. $(UV) pytest tests/test_upload_excel.py

test-order-metrics:
	PYTHONPATH=../.. $(UV) pytest tests/test_order_metrics.py

test-menu-item-cogs:
	PYTHONPATH=../.. $(UV) pytest tests/test_menu_item_cogs_query.py

test-menu-heatmaps:
	PYTHONPATH=../.. $(UV) pytest tests/test_menu_heatmaps_query.py

test-menu-engineering-matrix:
	PYTHONPATH=../.. $(UV) pytest tests/test_menu_engineering_matrix_query.py

test-qa:
	PYTHONPATH=../.. $(UV) pytest tests/test_qa_analytics.py -v

test:
	PYTHONPATH=../.. $(UV) pytest tests/ -v

load-report:
	@if [ -z "$(REPORT_PATH)" ]; then echo "REPORT_PATH is required"; exit 1; fi
	PYTHONPATH=../.. $(PYTHON) -m graphql.scripts.load_sales_report "$(REPORT_PATH)"

# Selective seed (default SCOPE=inventar). Requires USER_ID=... or DEV_CLERK_USER_ID.
# Examples:
#   make dev-data USER_ID=user_xxx
#   make dev-data SCOPE=analytics USER_ID=user_xxx EXCEL=/path/to/report.xlsx
#   make db-reset-dev SEED=1 USER_ID=user_xxx
dev-data:
	PYTHONPATH=../.. $(PYTHON) -m graphql.scripts.load_dev_data \
		--scope "$(or $(SCOPE),inventar)" \
		$(if $(USER_ID),--clerk-user-id "$(USER_ID)",) \
		$(if $(EXCEL),--excel "$(EXCEL)",) \
		$(if $(COGS),--cogs "$(COGS)",)

# Destructive schema reset via Alembic, then optional seed when SEED=1.
db-reset-dev: drop-db db-upgrade
	$(if $(SEED),$(MAKE) dev-data SCOPE="$(or $(SCOPE),inventar)" USER_ID="$(USER_ID)" EXCEL="$(EXCEL)" COGS="$(COGS)",)

lint:
	uv run --group dev ruff check .

format:
	uv run --group dev ruff format .

typecheck:
	uv run --group dev mypy server.py main.py schema resolvers data_sources reports

clean:
	rm -rf __pycache__
	rm -rf .pytest_cache
	rm -rf .ruff_cache
