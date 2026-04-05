package gentic

import (
	"github.com/daniel-dihardja/gentic-agents/internal/agent/flows/campaign"
	"github.com/daniel-dihardja/gentic-agents/internal/agent/flows/locationprofile"
	"github.com/daniel-dihardja/gentic-agents/internal/agent/flows/promotioncandidates"
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
	"github.com/daniel-dihardja/gentic/pkg/gentic/intent"
	"github.com/daniel-dihardja/gentic/pkg/steps"
)

// BuildAgent wires the Gentic SDK with a default chat flow behind intent routing.
// The default chat uses a simple assistant system prompt.
func BuildAgent(model, graphqlEndpoint string, maxReflectionIterations int, store gen.ThreadStore) gen.Agent {
	chatFlow := gen.NewFlow(steps.ChatStep{
		Model:        model,
		SystemPrompt: "You are a helpful assistant.",
	})
	locationProfileChatFlow := locationprofile.NewChatReactActor(model, graphqlEndpoint, maxReflectionIterations)
	campaignBriefChatFlow := campaign.NewChatReactActor(model, graphqlEndpoint, maxReflectionIterations)
	promotionCandidatesFlow := promotioncandidates.NewChatReactActor(model, graphqlEndpoint)
	// create_campaign_brief and update_campaign_brief both use the same ReAct brief agent (tools decide create vs fetch vs update).
	resolver := intent.NewRouter(
		"chat",
		"create_location_profile", "update_location_profile",
		"create_campaign_brief", "update_campaign_brief",
		"create_promotion_candidates",
	).
		On("create_location_profile", locationProfileChatFlow).
		On("update_location_profile", locationProfileChatFlow).
		On("create_campaign_brief", campaignBriefChatFlow).
		On("update_campaign_brief", campaignBriefChatFlow).
		On("create_promotion_candidates", promotionCandidatesFlow).
		Default(chatFlow)
	return gen.Agent{Resolver: resolver, MemoryStore: store}
}
