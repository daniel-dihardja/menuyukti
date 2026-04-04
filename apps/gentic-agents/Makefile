.PHONY: help run build test vet fmt lint clean \
	eval eval-live eval-intent eval-intent-campaign eval-intent-chat eval-intent-unknown eval-intent-ambiguous \
	eval-location eval-location-profile-exists eval-location-missing-ids eval-location-inference eval-location-operating

BIN ?= bin/gentic-agents
ADDR ?= :7777
EVAL_PKG := ./eval

help:
	@echo "gentic-agents (Go)"
	@echo ""
	@echo "  make run          - start the HTTP API (ADDR=$(ADDR))"
	@echo "  make run ADDR=:3000"
	@echo "  make build        - compile binary to $(BIN)"
	@echo "  make test         - go test ./..."
	@echo "  make eval         - go test $(EVAL_PKG) (agent evals)"
	@echo "  make eval-live    - live LLM evals (-tags=integration, needs OPENAI_API_KEY)"
	@echo "  make eval-intent  - intent routing eval suite"
	@echo "  make eval-location - location profile eval suite"
	@echo "  make eval-intent-campaign|chat|unknown|ambiguous - single intent eval case"
	@echo "  make eval-location-profile-exists|missing-ids|inference|operating - single location eval case"
	@echo "  make vet          - go vet ./..."
	@echo "  make fmt          - go fmt ./..."
	@echo "  make lint         - golangci-lint run ./... (install: https://golangci-lint.run/welcome/install/)"
	@echo "  make clean        - remove $(BIN)"

run:
	ADDR=$(ADDR) go run ./cmd/server

build:
	mkdir -p $(dir $(BIN))
	go build -o $(BIN) ./cmd/server

test:
	go test ./...

eval:
	go test $(EVAL_PKG) -count=1

eval-live:
	go test -tags=integration $(EVAL_PKG) -count=1 -run '^TestLive_'

eval-intent:
	go test $(EVAL_PKG) -count=1 -run '^TestEvalSuite_IntentRouting$$'

eval-intent-campaign:
	go test $(EVAL_PKG) -count=1 -run '^TestEvalSuite_IntentRouting$$/campaign_intent$$'

eval-intent-chat:
	go test $(EVAL_PKG) -count=1 -run '^TestEvalSuite_IntentRouting$$/chat_intent$$'

eval-intent-unknown:
	go test $(EVAL_PKG) -count=1 -run '^TestEvalSuite_IntentRouting$$/unknown_label_falls_back_to_default_chat$$'

eval-intent-ambiguous:
	go test $(EVAL_PKG) -count=1 -run '^TestEvalSuite_IntentRouting$$/ambiguous_defaults_to_chat$$'

eval-location:
	go test $(EVAL_PKG) -count=1 -run '^TestEvalSuite_LocationProfile$$'

eval-location-profile-exists:
	go test $(EVAL_PKG) -count=1 -run '^TestEvalSuite_LocationProfile$$/profile_exists_skips_create$$'

eval-location-missing-ids:
	go test $(EVAL_PKG) -count=1 -run '^TestEvalSuite_LocationProfile$$/missing_location_ids$$'

eval-location-inference:
	go test $(EVAL_PKG) -count=1 -run '^TestEvalSuite_LocationProfile$$/create_inference_only$$'

eval-location-operating:
	go test $(EVAL_PKG) -count=1 -run '^TestEvalSuite_LocationProfile$$/create_with_operating_data_reflect_loop$$'

vet:
	go vet ./...

fmt:
	go fmt ./...

lint:
	golangci-lint run ./...

clean:
	rm -f $(BIN)
