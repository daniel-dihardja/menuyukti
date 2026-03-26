//go:build integration

package eval_test

import (
	"context"
	"os"
	"testing"
	"time"

	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
	ge "github.com/daniel-dihardja/gentic/pkg/gentic/eval"
	"github.com/daniel-dihardja/gentic/pkg/gentic/intent"
	"github.com/daniel-dihardja/gentic/pkg/steps"
	"github.com/joho/godotenv"
)

func init() {
	// go test uses the package dir as cwd (eval/); gentic-agents/.env lives next to ./eval.
	_ = godotenv.Load("../.env")
	_ = godotenv.Load(".env")
}

// noopStep is a stand-in campaign flow so live intent tests do not call GraphQL.
type noopStep struct{}

func (noopStep) Run(ctx context.Context, s *gen.State) error {
	s.Output = "campaign flow (noop)"
	return nil
}

// TestLive_IntentRouting uses the real classifier LLM ([openai.Provider]) — no [ge.MockLLM].
// Requires OPENAI_API_KEY. Optional: INTENT_MODEL (see gentic intent.detect).
func TestLive_IntentRouting(t *testing.T) {
	if os.Getenv("OPENAI_API_KEY") == "" {
		t.Skip("set OPENAI_API_KEY (or gentic-agents/.env) to run live LLM evals (go test -tags=integration ./eval)")
	}

	chatFlow := gen.NewFlow(steps.ChatStep{
		Model:        "gpt-4o-mini",
		SystemPrompt: "You are a helpful assistant. Reply in one short sentence.",
	})
	// Only a noop so a live run never calls GraphQL; intent routing is what we exercise.
	campaignFlow := gen.NewFlow(noopStep{})
	resolver := intent.NewRouter("chat", "create_campaign").
		On("create_campaign", campaignFlow).
		Default(chatFlow)

	agent := gen.Agent{Resolver: resolver}
	runner := ge.Runner{Agent: agent}

	suite := ge.Suite{
		Name: "intent_routing_live",
		Cases: []ge.Case{
			{
				Name:  "campaign_phrase",
				Input: gen.AgentInput{Query: "I want to create a marketing campaign for my restaurant"},
				Scorers: []ge.Scorer{
					ge.IntentIs{Expected: "create_campaign"},
					ge.NoError{},
				},
			},
			{
				Name:  "chat_phrase",
				Input: gen.AgentInput{Query: "What is a good Instagram caption for a pizza photo?"},
				Scorers: []ge.Scorer{
					ge.IntentIs{Expected: "chat"},
					ge.NoError{},
				},
			},
		},
	}

	for _, c := range suite.Cases {
		c := c
		t.Run(c.Name, func(t *testing.T) {
			t.Parallel()
			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
			defer cancel()
			results := runner.Run(ctx, ge.Suite{Name: suite.Name, Cases: []ge.Case{c}})
			if len(results) != 1 {
				t.Fatalf("expected 1 result, got %d", len(results))
			}
			r := results[0]
			t.Logf("trace: intent=%q output_len=%d duration=%s err=%v",
				r.Trace.Intent, len(r.Trace.Output), r.Trace.Duration, r.Trace.Err)
			if !r.Pass {
				t.Fatalf("case %q failed: scores=%+v trace.Output=%q", c.Name, r.Scores, r.Trace.Output)
			}
		})
	}
}
