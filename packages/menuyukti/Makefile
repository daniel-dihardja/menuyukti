.PHONY: help test unit_tests agent_tests core_tests integration_tests clean lint type-check format

help:
	@echo "menuyukti test commands:"
	@echo ""
	@echo "  make test              - Run all unit tests"
	@echo "  make unit_tests        - Run all unit tests (alias)"
	@echo "  make agent_tests       - Run agent unit tests only"
	@echo "  make core_tests        - Run core unit tests only"
	@echo "  make test_verbose      - Run all unit tests with verbose output"
	@echo "  make test_coverage     - Run tests with coverage report"
	@echo ""
	@echo "Other commands:"
	@echo "  make clean             - Remove pytest cache and compiled files"
	@echo "  make lint              - Run pylint (if configured)"
	@echo "  make type-check        - Run mypy type checking"
	@echo "  make format            - Auto-format code with black"

# Run all unit tests
test:
	python -m pytest tests/unit/ -v

# Alias for test
unit_tests: test

# Run agent tests only
agent_tests:
	python -m pytest tests/unit/agents/ -v

# Run core tests only
core_tests:
	python -m pytest tests/unit/core/ -v

# Run all tests with verbose output
test_verbose:
	python -m pytest tests/unit/ -vv --tb=short

# Run tests with coverage report
test_coverage:
	python -m pytest tests/unit/ --cov=menuyukti --cov-report=html --cov-report=term-missing
	@echo "Coverage report generated in htmlcov/index.html"

# Run tests and stop on first failure
test_fast:
	python -m pytest tests/unit/ -x

# Run specific test file
test_file:
	@read -p "Enter test file path (relative to tests/): " file; \
	python -m pytest tests/$$file -v

# Run specific test by name (requires TEST_NAME env var)
test_by_name:
	python -m pytest tests/unit/ -k "$(TEST_NAME)" -v

# Watch mode - rerun tests on file changes (requires pytest-watch)
test_watch:
	ptw tests/unit/ -- -v

# Clean up test artifacts
clean:
	rm -rf .pytest_cache __pycache__
	rm -rf htmlcov .coverage
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete

# Type checking
type-check:
	mypy src/menuyukti --ignore-missing-imports

# Linting (if pylint is available)
lint:
	pylint src/menuyukti --disable=all --enable=E,F --max-line-length=120 || true

# Auto-format code
format:
	black src/menuyukti tests/

# Run all checks
check: lint type-check test

# Development setup
dev-install:
	pip install -e .
	pip install pytest pytest-cov pytest-watch

# Show test statistics
test_stats:
	@echo "=== Agent Tests ==="
	@python -m pytest tests/unit/agents/ --collect-only -q | tail -1
	@echo "=== Core Tests ==="
	@python -m pytest tests/unit/core/ --collect-only -q | tail -1
	@echo "=== Total Unit Tests ==="
	@python -m pytest tests/unit/ --collect-only -q | tail -1
