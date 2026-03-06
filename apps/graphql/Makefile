PYTHON=uv run python
UV=uv run
UVICORN=uv run uvicorn

.PHONY: install run dev migrate-db drop-db test-upload test-order-metrics test-menu-item-cogs test-menu-heatmaps load-report lint format clean

install:
	uv sync

run:
	$(UVICORN) server:app --host 0.0.0.0 --port 8000

dev:
	$(UVICORN) server:app --reload --host 0.0.0.0 --port 8000

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

load-report:
	@if [ -z "$(REPORT_PATH)" ]; then echo "REPORT_PATH is required"; exit 1; fi
	PYTHONPATH=../.. $(PYTHON) -m graphql.scripts.load_sales_report "$(REPORT_PATH)"

lint:
	uv run ruff check .

format:
	uv run ruff format .

clean:
	rm -rf __pycache__
	rm -rf .pytest_cache
	rm -rf .ruff_cache
