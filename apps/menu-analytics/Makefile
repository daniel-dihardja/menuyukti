.PHONY: dev sync test docker-build docker-run

## Start FastAPI in dev mode
dev:
	cd ../.. && uv run uvicorn apps.api.app.main:app --reload


## Sync workspace dependencies (from repo root)
sync:
	cd ../.. && uv sync

## Run API tests
test:
	cd ../.. && pytest apps/api

## Build Docker image for API
docker-build:
	cd ../.. && docker build -t menuyukti-api -f apps/api/Dockerfile .

## Run API container
docker-run:
	docker run -p 8000:8000 menuyukti-api
