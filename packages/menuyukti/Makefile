.PHONY: help test unit_tests core_tests clean lint type-check format

help:
	@echo "menuyukti test commands:"
	@echo ""
	@echo "  make test              - Run all unit tests"
	@echo "  make unit_tests        - Run all unit tests (alias)"
	@echo "  make core_tests        - Run core unit tests only"
	@echo "  make test_verbose      - Run all unit tests with verbose output"
	@echo "  make test_coverage     - Run tests with coverage report"
	@echo ""
	@echo "Other commands:"
	@echo "  make clean             - Remove pytest cache and compiled files"
	@echo "  make lint              - Run Ruff lint (from repo root: uv run ruff check)"
	@echo "  make type-check        - Run mypy type checking"
	@echo "  make format            - Run Ruff format (from repo root: uv run ruff format)"

# Run all unit tests
test:
	uv run pytest tests/ -v

# Alias for test
unit_tests: test

# Run core analytics tests only
core_tests:
	uv run pytest tests/unit/core/ -v

# Run all tests with verbose output
test_verbose:
	uv run pytest tests/ -vv --tb=short

# Run tests with coverage report
test_coverage:
	uv run pytest tests/ --cov=menuyukti --cov-report=html --cov-report=term-missing
	@echo "Coverage report generated in htmlcov/index.html"

# Run tests and stop on first failure
test_fast:
	uv run pytest tests/ -x

# Clean up test artifacts
clean:
	rm -rf .pytest_cache __pycache__
	rm -rf htmlcov .coverage
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete

# Type checking
type-check:
	uv run mypy src/menuyukti --ignore-missing-imports

# Linting via workspace Ruff
lint:
	uv run ruff check src/menuyukti tests/

# Format via workspace Ruff
format:
	uv run ruff format src/menuyukti tests/

# Run all checks
check: lint type-check test
