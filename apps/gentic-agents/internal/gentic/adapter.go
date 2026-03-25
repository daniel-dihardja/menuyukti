package gentic

import (
	"github.com/daniel-dihardja/gentic-agents/internal/agent/step"
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
	"github.com/daniel-dihardja/gentic/pkg/gentic/intent"
)

// BuildAgent wires the Gentic SDK with a default chat flow behind intent routing.
func BuildAgent(model, systemPrompt string) gen.Agent {
	chatFlow := gen.NewFlow(step.ChatStep{
		Model:        model,
		SystemPrompt: systemPrompt,
	})
	resolver := intent.NewRouter("chat", "create_campaign").
		On("create_campaign", gen.NewFlow(step.CreateCampaignStep{})).
		Default(chatFlow)
	return gen.Agent{Resolver: resolver}
}
