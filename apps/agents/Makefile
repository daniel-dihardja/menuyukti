.PHONY: all format lint test tests test_watch integration_tests mocked_baseline_tests docker_tests help extended_tests serve_api

# Default target executed when no arguments are given to make.
all: help

# Define a variable for the test file path.
TEST_FILE ?= tests/unit_tests/
AGENTS_API_PORT ?= 8001

test:
	uv run python -m pytest $(TEST_FILE)

integration_tests:
	AGENTS_LLM_ENABLED=false LANGCHAIN_TRACING_V2=false uv run python -m pytest tests/integration_tests -m "not langsmith"

mocked_baseline_tests:
	LANGCHAIN_TRACING_V2=false uv run python -m pytest tests/integration_tests/test_mocked_input_baseline_per_agent.py

test_watch:
	uv run python -m ptw --snapshot-update --now . -- -vv tests/unit_tests

test_profile:
	uv run python -m pytest -vv tests/unit_tests/ --profile-svg

extended_tests:
	uv run python -m pytest --only-extended $(TEST_FILE)

serve_api:
	uv run uvicorn agent.api:app --reload --port $(AGENTS_API_PORT)


######################
# LINTING AND FORMATTING
######################

# Define a variable for Python and notebook files.
PYTHON_FILES=src/
MYPY_CACHE=.mypy_cache
lint format: PYTHON_FILES=.
lint_diff format_diff: PYTHON_FILES=$(shell git diff --name-only --diff-filter=d main | grep -E '\.py$$|\.ipynb$$')
lint_package: PYTHON_FILES=src
lint_tests: PYTHON_FILES=tests
lint_tests: MYPY_CACHE=.mypy_cache_test

lint lint_diff lint_package lint_tests:
	python -m ruff check .
	[ "$(PYTHON_FILES)" = "" ] || python -m ruff format $(PYTHON_FILES) --diff
	[ "$(PYTHON_FILES)" = "" ] || python -m ruff check --select I $(PYTHON_FILES)
	[ "$(PYTHON_FILES)" = "" ] || python -m mypy --strict $(PYTHON_FILES)
	[ "$(PYTHON_FILES)" = "" ] || mkdir -p $(MYPY_CACHE) && python -m mypy --strict $(PYTHON_FILES) --cache-dir $(MYPY_CACHE)

format format_diff:
	ruff format $(PYTHON_FILES)
	ruff check --select I --fix $(PYTHON_FILES)

spell_check:
	codespell --toml pyproject.toml

spell_fix:
	codespell --toml pyproject.toml -w

######################
# HELP
######################

help:
	@echo '----'
	@echo 'format                       - run code formatters'
	@echo 'lint                         - run linters'
	@echo 'test                         - run unit tests'
	@echo 'tests                        - run unit tests'
	@echo 'test TEST_FILE=<test_file>   - run all tests in file'
	@echo 'test_watch                   - run unit tests in watch mode'
	@echo 'mocked_baseline_tests        - run mandatory per-agent mocked baseline integration suite'
	@echo 'serve_api                    - run FastAPI on AGENTS_API_PORT (default: 8001)'
