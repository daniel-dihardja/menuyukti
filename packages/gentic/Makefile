.PHONY: test vet fmt lint

GOLANGCI_LINT ?= golangci-lint

test:
	go test ./...

vet:
	go vet ./...

fmt:
	go fmt ./...

lint:
	$(GOLANGCI_LINT) run ./...
