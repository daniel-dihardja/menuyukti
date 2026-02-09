.PHONY: dev sync test docker-build docker-run

## Start FastAPI in dev mode
dev:
	cd ../.. && uv run uvicorn apps.menu-analytics.app.main:app --reload


## Sync workspace dependencies (from repo root)
sync:
	cd ../.. && uv sync

## Run API tests
test:
	cd ../.. && pytest apps/menu-analytics

## Build Docker image for API
docker-build:
	cd ../.. && docker build -t menuyukti-menu-analytics -f apps/menu-analytics/Dockerfile .

## Run API container
docker-run:
	docker run -p 8000:8000 menuyukti-menu-analytics
