PYTHON=uv run python
UVICORN=uv run uvicorn

.PHONY: install run dev migrate-db drop-db lint format clean

install:
	uv sync

run:
	$(UVICORN) server:app --host 0.0.0.0 --port 8000

dev:
	$(UVICORN) server:app --reload --host 0.0.0.0 --port 8000

migrate-db:
	PYTHONPATH=../.. $(PYTHON) -m apps.graphql.data_sources.database

drop-db:
	PYTHONPATH=../.. $(PYTHON) -m apps.graphql.data_sources.database drop

lint:
	uv run ruff check .

format:
	uv run ruff format .

clean:
	rm -rf __pycache__
	rm -rf .pytest_cache
	rm -rf .ruff_cache
