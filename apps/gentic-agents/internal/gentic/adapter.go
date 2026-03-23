package gentic

import (
	"github.com/daniel-dihardja/gentic-agents/internal/agent/step"
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
	"github.com/daniel-dihardja/gentic/pkg/gentic/intent"
)

// BuildAgent wires the Gentic SDK with a default chat flow behind intent routing.
// Specialized branches can be added later with router.On("label", flow).
func BuildAgent(model, systemPrompt string) gen.Agent {
	chatFlow := gen.NewFlow(step.ChatStep{
		Model:        model,
		SystemPrompt: systemPrompt,
	})
	resolver := intent.NewRouter("chat").
		Default(chatFlow)
	return gen.Agent{Resolver: resolver}
}

// directResolver satisfies IntentResolver; StreamWithContext never invokes it.
type directResolver struct{}

func (directResolver) Resolve(_ *gen.State) gen.Flow {
	return gen.NewFlow()
}

// BuildStreamingAgent returns an Agent used with gentic.Agent.StreamWithContext only
// (the flow/resolver pipeline is bypassed for streaming).
func BuildStreamingAgent() gen.Agent {
	return gen.Agent{Resolver: directResolver{}}
}
