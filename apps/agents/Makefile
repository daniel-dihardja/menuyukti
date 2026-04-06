PYTHON=uv run python
UV=uv run
UVICORN=uv run uvicorn

.PHONY: install run dev test lint format typecheck clean

install:
	uv sync --all-groups

run:
	PYTHONPATH=../.. $(UVICORN) agents_app.server:app --host 0.0.0.0 --port 8001

dev:
	PYTHONPATH=../.. $(UVICORN) agents_app.server:app --reload --host 0.0.0.0 --port 8001

test:
	PYTHONPATH=../.. $(UV) pytest tests/ -v

lint:
	uv run --group dev ruff check .

format:
	uv run --group dev ruff format .

typecheck:
	uv run --group dev mypy server.py agents models prompts routers

clean:
	rm -rf __pycache__
	rm -rf .pytest_cache
	rm -rf .ruff_cache
	rm -rf .mypy_cache
