package gentic

import (
	"github.com/daniel-dihardja/gentic-agents/internal/agent/flows/campaign"
	"github.com/daniel-dihardja/gentic-agents/internal/agent/flows/locationprofile"
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
	"github.com/daniel-dihardja/gentic/pkg/gentic/intent"
	"github.com/daniel-dihardja/gentic/pkg/steps"
)

// BuildAgent wires the Gentic SDK with a default chat flow behind intent routing.
// The default chat uses step.DefaultChatSystemPrompt.
func BuildAgent(model, graphqlEndpoint string, maxReflectionIterations int, store gen.ThreadStore) gen.Agent {
	chatFlow := gen.NewFlow(steps.ChatStep{
		Model:        model,
		SystemPrompt: "You are a helpful assistant.",
	})
	locationProfileChatFlow := locationprofile.NewChatReactActor(model, graphqlEndpoint, maxReflectionIterations)
	campaignBriefChatFlow := campaign.NewChatReactActor(model, graphqlEndpoint, maxReflectionIterations)
	// create_campaign_brief and update_campaign_brief both use the same ReAct brief agent (tools decide create vs fetch vs update).
	resolver := intent.NewRouter(
		"chat",
		"create_location_profile", "update_location_profile",
		"create_campaign_brief", "update_campaign_brief",
	).
		On("create_location_profile", locationProfileChatFlow).
		On("update_location_profile", locationProfileChatFlow).
		On("create_campaign_brief", campaignBriefChatFlow).
		On("update_campaign_brief", campaignBriefChatFlow).
		Default(chatFlow)
	return gen.Agent{Resolver: resolver, MemoryStore: store}
}
