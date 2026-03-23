# My Agent API — Revised Project Structure

## Overview

Go-based API service using the Gentic library for agentic workflows.
Single API endpoint with internal intent-based routing to execution flows.

---

```
my-agent-api/
│
├── cmd/
│   └── server/
│       └── main.go                    # Entry point. Wires dependencies, starts HTTP server.
│
├── internal/
│   │
│   ├── api/
│   │   ├── router.go                  # Route definitions, middleware chain assembly.
│   │   ├── middleware/
│   │   │   ├── logging.go             # Structured request/response logging.
│   │   │   ├── recovery.go            # Panic recovery.
│   │   │   └── requestid.go           # X-Request-ID propagation via context.
│   │   ├── handler/
│   │   │   └── run_agent.go           # POST /run — validates input, calls agent layer, writes response.
│   │   └── dto/
│   │       ├── request.go             # Inbound API request structs + validation.
│   │       └── response.go            # Outbound API response structs.
│   │
│   ├── agent/
│   │   ├── runner.go                  # Orchestrator: classify → route → execute flow → return result.
│   │   ├── runner_test.go             # Tests with mocked intent classifier and flows.
│   │   │
│   │   ├── intent/
│   │   │   ├── classifier.go          # IntentClassifier interface + implementation (rule/LLM-based).
│   │   │   └── router.go              # Maps classified intent → Flow. Returns error for unknown intents.
│   │   │
│   │   ├── flow/
│   │   │   ├── flow.go                # Flow interface definition.
│   │   │   ├── search.go              # Search flow implementation.
│   │   │   ├── analysis.go            # Analysis/reasoning flow implementation.
│   │   │   └── fallback.go            # Default/fallback flow.
│   │   │
│   │   ├── tool/
│   │   │   ├── tool.go                # Tool interface — what the agent can invoke during execution.
│   │   │   ├── web_search.go          # Web search tool implementation.
│   │   │   └── database_lookup.go     # DB lookup tool (uses repo from platform layer).
│   │   │
│   │   └── model/
│   │       ├── input.go               # AgentInput: what the runner receives.
│   │       ├── output.go              # AgentResult: what the runner returns.
│   │       └── intent.go              # Intent enum/constants.
│   │
│   ├── gentic/
│   │   └── adapter.go                 # Thin wrapper around the Gentic SDK.
│   │                                  # Translates internal types ↔ Gentic types.
│   │                                  # Isolates the rest of the codebase from Gentic API changes.
│   │
│   └── platform/
│       ├── config/
│       │   └── config.go              # Loads env vars / config files into a typed Config struct.
│       ├── database/
│       │   └── postgres.go            # Connection pool setup, health check, shutdown.
│       └── llmclient/
│           └── client.go              # LLM HTTP client. Used by classifier + gentic adapter.
│
├── go.mod
└── go.work                            # (optional) Multi-module workspace.
```

---

## What Changed and Why

### 1. `api/dto/` — Dedicated request/response types
Decouples the HTTP contract from internal agent models. The handler maps
`dto.RunRequest → agent.AgentInput` and `agent.AgentResult → dto.RunResponse`.
This means internal model changes don't break the API surface.

### 2. `api/middleware/` — Explicit middleware package
Even a thin API layer needs logging, panic recovery, and request-ID propagation.
Giving middleware its own package keeps `router.go` clean and makes each
concern independently testable.

### 3. `agent/tool/` with a `Tool` interface (renamed from `tools/`)
A tool is something the agent can **invoke during execution** — web search,
database lookup, etc. The LLM client is no longer here; it's a platform
dependency injected into the components that need it. This removes the
conceptual overlap with infrastructure.

### 4. `agent/flow/` with a `Flow` interface (renamed from `flows/`)
Go convention: package names are singular (`flow`, not `flows`).
Adding a `flow.go` file with the interface definition makes the contract
explicit and enables testing flows in isolation with mocked tools.

### 5. `agent/model/` replaces the monolithic `types.go`
Split into `input.go`, `output.go`, and `intent.go`. Types stay close to
the agent domain and are easy to find. As the project grows, this package
stays navigable.

### 6. `gentic/adapter.go` — SDK isolation layer
Gentic is a third-party dependency. Wrapping it behind an adapter means:
- Internal code depends on your interfaces, not Gentic's types.
- Upgrading or replacing Gentic is a change in one package.
- You can mock the adapter in tests.

### 7. `platform/` replaces `infrastructure/`
More idiomatic Go naming. Sub-packages (`config/`, `database/`, `llmclient/`)
give each concern a clear home. The LLM HTTP client lives here because it's
a platform capability, not an agent tool.

---

## Execution Flow (unchanged intent, cleaner boundaries)

```
POST /run
   │
   ▼
middleware (logging → requestid → recovery)
   │
   ▼
handler.RunAgent
   │  validates dto.RunRequest
   │  maps to agent.AgentInput
   │
   ▼
agent.Runner.Run(ctx, input)
   │
   ├─▶ intent.Classifier.Classify(input)
   │
   ├─▶ intent.Router.Route(intent) → flow.Flow
   │
   ├─▶ flow.Execute(ctx, input, tools)
   │       └─▶ gentic.Adapter  (orchestrates LLM + tool calls)
   │
   ▼
agent.AgentResult → dto.RunResponse → HTTP 200
```

---

## Key Principles (updated)

- **Single endpoint** — `/run` is the only entry point.
- **Intent-based routing** — classification drives flow selection internally.
- **Interface boundaries** — `Flow`, `Tool`, `IntentClassifier` are all interfaces.
  Swap implementations without touching callers.
- **Dependency injection** — `main.go` wires everything. No package-level globals.
- **SDK isolation** — Gentic lives behind `internal/gentic/adapter.go`.
- **Thin API layer** — handlers do validation and mapping, nothing else.
- **Singular package names** — `flow`, `tool`, `handler` (Go convention).
