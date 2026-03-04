PYTHON=uv run python
UV=uv run
UVICORN=uv run uvicorn

.PHONY: install run dev migrate-db drop-db test-upload load-report lint format clean

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
	DATABASE_URL=sqlite+pysqlite:///$(CURDIR)/test.db PYTHONPATH=../.. $(UV) pytest tests/test_upload_excel.py

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
