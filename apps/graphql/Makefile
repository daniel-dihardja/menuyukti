PYTHON=uv run python
UV=uv run
UVICORN=uv run uvicorn

.PHONY: install run dev migrate-db drop-db test test-qa test-upload test-order-metrics test-menu-item-cogs test-menu-heatmaps test-menu-engineering-matrix load-report dev-data lint format typecheck clean

install:
	uv sync --all-groups

run:
	PYTHONPATH=../.. $(UVICORN) graphql.server:app --host 0.0.0.0 --port 8000

dev:
	PYTHONPATH=../.. $(UVICORN) graphql.server:app --reload --host 0.0.0.0 --port 8000

migrate-db:
	PYTHONPATH=../.. $(PYTHON) -m graphql.data_sources.database

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

# Seeds Workspace + Location with clerk_user_id from DEV_CLERK_USER_ID (default dev_local_user); see README.
dev-data:
	PYTHONPATH=../.. $(PYTHON) -m graphql.scripts.load_dev_data

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
