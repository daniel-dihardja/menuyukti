# gentic-agents

HTTP service that runs the Menuyukti agent on [Gentic](https://github.com/daniel-dihardja/gentic) (`github.com/daniel-dihardja/gentic`). [`internal/gentic/adapter.go`](internal/gentic/adapter.go) wires **`intent.Router`** to flows: default chat, **location profile** (`create_location_profile`, `update_location_profile`), and **campaign brief** (`create_campaign_brief`, `update_campaign_brief`). Each specialized route uses the appropriate ReAct flow; the default branch is a simple chat step.

## Agent evals

Evaluations live under [`eval/`](eval/) and use the SDK package [`gentic/pkg/gentic/eval`](../../packages/gentic/pkg/gentic/eval/):

- **`Runner`** — runs `gentic.Agent` with `eval.WithRecorder(ctx, eval.NewRecorder())` so each step can append spans; results include **`Trace`** (intent, output, duration, per-step traces) and **`Score`** slices from **`Scorer`** implementations.
- **`Scorer`** — composable checks such as **`IntentIs`**, **`OutputContains`**, **`NoError`**, **`MaxDuration`**.
- **`MockLLM`** — implements **`gentic.LLM`** for deterministic routing and generation in tests.

Production steps record eval spans when a recorder is present:

- [`locationprofile.CheckStep`](internal/agent/flows/locationprofile/check.go) — `check_location_profile`
- [`locationprofile.CreateStep`](internal/agent/flows/locationprofile/create.go) — `create_location_profile`

For integration-style tests without real GraphQL or OpenAI, inject **`ProfileLoader`**, **`LocationDataLoader`**, **`ProfileSaver`**, and **`LLM`** on those steps (see the eval tests).

### Live LLM evals (not mocked)

The default eval tests use **`eval.MockLLM`** so CI stays fast, deterministic, and offline. To exercise **real** models:

1. **Use the default provider** — [`openai.Provider`](../../packages/gentic/pkg/providers/openai/openai.go) implements [`gentic.LLM`](../../packages/gentic/pkg/gentic/llm.go). Anywhere you pass **`LLM: nil`** (or omit **`WithLLM(...)`** on [`intent.Router`](../../packages/gentic/pkg/gentic/intent/router.go)), the stack uses the real API.
2. **Environment** — set **`OPENAI_API_KEY`**, or put it in **`.env`** at the **`gentic-agents/`** root (same layout as the server). [`live_llm_test.go`](eval/live_llm_test.go) loads **`../.env`** relative to the `eval/` package when tests run, so `make eval-live` picks up the key without exporting it in the shell. For intent classification, configure the model with **`intent.Router.WithModel("...")`** (empty uses the package default in [`intent.detect`](../../packages/gentic/pkg/gentic/intent/detect.go) — see **`openai.DefaultModel`**).
3. **Build tag** — live tests live in [`eval/live_llm_test.go`](eval/live_llm_test.go) behind **`//go:build integration`** so `go test ./...` does not call the network. Run them with **`go test -tags=integration ./eval`** (and the key set).
4. **Scoring** — [`OutputContains`](../../packages/gentic/pkg/gentic/eval/scorers.go) and exact **`IntentIs`** checks can **flake** with real models. Prefer: **`NoError`**, timeouts (**`MaxDuration`**), structural checks (e.g. required headings in output), logging **`Trace`** for human review, or add a **custom `Scorer`** that calls a judge model / rubric. For intent labels, keep prompts unambiguous or accept occasional mislabels in automation.
5. **End-to-end** — for real **GraphQL + LLM** (e.g. location profile creation), point **`GraphQLEndpoint`** at a safe environment, omit the mock loaders/saver, and run a dedicated integration test or script with secrets — not checked into CI by default.

```bash
export OPENAI_API_KEY=...
make eval-live          # integration-tagged tests matching TestLive_*
# or
go test -tags=integration ./eval -run '^TestLive_' -count=1 -v
```

### Running evals from the repo

From `apps/gentic-agents`:

```bash
# All eval tests (intent + location profile)
make eval

# Full test suite including unit tests
make test
```

### Makefile targets (per suite / per case)

| Target | What it runs |
|--------|----------------|
| `make eval` | All tests in `./eval/...` |
| `make eval-intent` | Intent routing suite |
| `make eval-intent-campaign` | `campaign_intent` |
| `make eval-intent-chat` | `chat_intent` |
| `make eval-intent-unknown` | `unknown_label_falls_back_to_default_chat` |
| `make eval-intent-ambiguous` | `ambiguous_defaults_to_chat` |
| `make eval-location` | Location profile suite (all subtests) |
| `make eval-location-profile-exists` | Existing profile skips create |
| `make eval-location-missing-ids` | Missing `location_id` / `analytics_id` |
| `make eval-location-inference` | Inference-only profile creation (mocked LLM + saver) |
| `make eval-location-operating` | Profile creation with operating data (`MaxReflectionIterations: 0`) |
| `make eval-live` | Live LLM tests (`-tags=integration`, needs `OPENAI_API_KEY`) |

### Running a single test with `go test`

Subtests match `go test -run Parent/Child`:

```bash
cd apps/gentic-agents

# One intent case
go test ./eval -run 'TestEvalSuite_IntentRouting/campaign_intent' -count=1 -v

# One location-profile case
go test ./eval -run 'TestEvalSuite_LocationProfile/missing_location_ids' -count=1 -v
```

The `-run` argument is a regular expression; anchor with `^` / `$` if you need an exact match.
