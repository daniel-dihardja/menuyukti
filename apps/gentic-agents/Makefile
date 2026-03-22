.PHONY: help run build test vet fmt clean

BIN ?= bin/gentic-agents
ADDR ?= :7777

help:
	@echo "gentic-agents (Go)"
	@echo ""
	@echo "  make run          - start the HTTP API (ADDR=$(ADDR))"
	@echo "  make run ADDR=:3000"
	@echo "  make build        - compile binary to $(BIN)"
	@echo "  make test         - go test ./..."
	@echo "  make vet          - go vet ./..."
	@echo "  make fmt          - go fmt ./..."
	@echo "  make clean        - remove $(BIN)"

run:
	ADDR=$(ADDR) go run ./cmd/server

build:
	mkdir -p $(dir $(BIN))
	go build -o $(BIN) ./cmd/server

test:
	go test ./...

vet:
	go vet ./...

fmt:
	go fmt ./...

clean:
	rm -f $(BIN)
