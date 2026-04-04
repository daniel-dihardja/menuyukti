package eval_test

import (
	"context"
	"strings"
	"testing"

	"github.com/daniel-dihardja/gentic-agents/internal/agent/flowstate"
	"github.com/daniel-dihardja/gentic-agents/internal/agent/flows/locationprofile"
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
	ge "github.com/daniel-dihardja/gentic/pkg/gentic/eval"
	"github.com/daniel-dihardja/gentic/pkg/gentic/intent"
	"github.com/daniel-dihardja/gentic/pkg/steps"
)

// intentClassifierLLM maps user phrasing to label strings returned by the same
// prompt shape as [intent.Router] (single label, lowercased by the router).
func intentClassifierLLM() *ge.MockLLM {
	return &ge.MockLLM{
		ChatFunc: func(ctx context.Context, model, system, user string) (string, error) {
			u := strings.ToLower(strings.TrimSpace(user))
			switch {
			case strings.Contains(u, "campaign"):
				return "create_campaign", nil
			case strings.Contains(u, "hello"):
				return "unknown", nil
			default:
				return "chat", nil
			}
		},
	}
}

func chatFlowLLM() *ge.MockLLM {
	return ge.ReplyChat("mock-chat-response", nil)
}

func buildIntentEvalAgent(t *testing.T) gen.Agent {
	t.Helper()
	chatFlow := gen.NewFlow(steps.ChatStep{
		LLM:          chatFlowLLM(),
		Model:        "gpt-4o-mini",
		SystemPrompt: "You are a helpful assistant.",
	})
	campaignFlow := gen.NewFlow(
		locationprofile.CheckStep{GraphQLEndpoint: "http://unused"},
		gen.If(flowstate.NeedsLocationProfileCreation, locationprofile.CreateStep{
			GraphQLEndpoint: "http://unused",
		}),
	)
	resolver := intent.NewRouter("chat", "create_campaign").
		WithLLM(intentClassifierLLM()).
		On("create_campaign", campaignFlow).
		Default(chatFlow)
	return gen.Agent{Resolver: resolver}
}

func TestEvalSuite_IntentRouting(t *testing.T) {
	t.Parallel()
	agent := buildIntentEvalAgent(t)
	runner := ge.Runner{Agent: agent}
	suite := ge.Suite{
		Name: "intent_routing",
		Cases: []ge.Case{
			{
				Name:  "campaign_intent",
				Input: gen.AgentInput{Query: "I want to create a campaign for my restaurant"},
				Scorers: []ge.Scorer{
					ge.IntentIs{Expected: "create_campaign"},
					ge.NoError{},
				},
			},
			{
				Name:  "chat_intent",
				Input: gen.AgentInput{Query: "What marketing tips do you have?"},
				Scorers: []ge.Scorer{
					ge.IntentIs{Expected: "chat"},
					ge.NoError{},
					ge.OutputContains{Substr: "mock-chat-response"},
				},
			},
			{
				Name:  "unknown_label_falls_back_to_default_chat",
				Input: gen.AgentInput{Query: "hello"},
				Scorers: []ge.Scorer{
					ge.IntentIs{Expected: "unknown"},
					ge.NoError{},
					ge.OutputContains{Substr: "mock-chat-response"},
				},
			},
			{
				Name:  "ambiguous_defaults_to_chat",
				Input: gen.AgentInput{Query: "maybe later"},
				Scorers: []ge.Scorer{
					ge.IntentIs{Expected: "chat"},
					ge.NoError{},
					ge.OutputContains{Substr: "mock-chat-response"},
				},
			},
		},
	}
	ctx := context.Background()
	for _, c := range suite.Cases {
		c := c
		t.Run(c.Name, func(t *testing.T) {
			t.Parallel()
			results := runner.Run(ctx, ge.Suite{Name: suite.Name, Cases: []ge.Case{c}})
			if len(results) != 1 {
				t.Fatalf("expected 1 result, got %d", len(results))
			}
			r := results[0]
			if !r.Pass {
				t.Fatalf("case %q failed: trace=%+v scores=%+v err=%v", r.Case.Name, r.Trace, r.Scores, r.Trace.Err)
			}
		})
	}
}
