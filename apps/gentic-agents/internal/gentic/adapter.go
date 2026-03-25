package gentic

import (
	"github.com/daniel-dihardja/gentic-agents/internal/agent/step"
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
	"github.com/daniel-dihardja/gentic/pkg/gentic/intent"
	"github.com/daniel-dihardja/gentic/pkg/steps"
)

// BuildAgent wires the Gentic SDK with a default chat flow behind intent routing.
func BuildAgent(model, systemPrompt, graphqlEndpoint string, maxReflectionIterations int) gen.Agent {
	chatFlow := gen.NewFlow(steps.ChatStep{
		Model:        model,
		SystemPrompt: systemPrompt,
	})
	campaignFlow := gen.NewFlow(
		step.CheckLocationProfileStep{
			GraphQLEndpoint: graphqlEndpoint,
		},
		step.CreateLocationProfileStep{
			GraphQLEndpoint:         graphqlEndpoint,
			Model:                   model,
			MaxReflectionIterations: maxReflectionIterations,
		},
	)
	resolver := intent.NewRouter("chat", "create_campaign").
		On("create_campaign", campaignFlow).
		Default(chatFlow)
	return gen.Agent{Resolver: resolver}
}
