package gentic

import (
	"github.com/daniel-dihardja/gentic-agents/internal/agent/flows/campaign"
	"github.com/daniel-dihardja/gentic-agents/internal/agent/flows/locationprofile"
	"github.com/daniel-dihardja/gentic-agents/internal/agent/flows/promotion"
	"github.com/daniel-dihardja/gentic-agents/internal/agent/flows/save"
	"github.com/daniel-dihardja/gentic-agents/internal/agent/flows/schedule"
	"github.com/daniel-dihardja/gentic-agents/internal/agent/flowstate"
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
	"github.com/daniel-dihardja/gentic/pkg/gentic/eval"
	"github.com/daniel-dihardja/gentic/pkg/gentic/intent"
	"github.com/daniel-dihardja/gentic/pkg/steps"
)

// BuildAgent wires the Gentic SDK with a default chat flow behind intent routing.
// The default chat uses step.DefaultChatSystemPrompt.
func BuildAgent(model, graphqlEndpoint string, maxReflectionIterations int) gen.Agent {
	chatFlow := gen.NewFlow(steps.ChatStep{
		Model:        model,
		SystemPrompt: "You are a helpful assistant.",
	})
	campaignFlow := gen.NewFlow(
		eval.WrapWithEval("check_location_profile",
			locationprofile.CheckStep{
				GraphQLEndpoint: graphqlEndpoint,
			}),
		gen.If(flowstate.NeedsLocationProfileCreation, eval.WrapWithEval("create_location_profile",
			locationprofile.CreateStep{
				GraphQLEndpoint:         graphqlEndpoint,
				Model:                   model,
				MaxReflectionIterations: maxReflectionIterations,
			})),
		eval.WrapWithEval("create_campaign_brief",
			campaign.CreateBriefStep{
				Model:                   model,
				MaxReflectionIterations: maxReflectionIterations,
			}),
		gen.Parallel(
			eval.WrapWithEval("create_post_schedule",
				schedule.CreateStep{
					Model:                   model,
					MaxReflectionIterations: maxReflectionIterations,
				}),
			eval.WrapWithEval("fetch_promotion_items",
				promotion.FetchStep{
					GraphQLEndpoint: graphqlEndpoint,
				}),
		),
		eval.WrapWithEval("select_promotion_items",
			promotion.SelectStep{
				Model:                   model,
				MaxReflectionIterations: maxReflectionIterations,
			}),
		eval.WrapWithEval("assign_post_formats",
			promotion.FormatsStep{
				Model:                   model,
				MaxReflectionIterations: maxReflectionIterations,
			}),
		eval.WrapWithEval("save_campaign",
			save.Step{
				GraphQLEndpoint: graphqlEndpoint,
			}),
	)
	locationProfileChatFlow := locationprofile.NewChatReactActor(model, graphqlEndpoint)
	locationProfileFlow := gen.NewFlow(
		eval.WrapWithEval("check_location_profile",
			locationprofile.CheckStep{
				GraphQLEndpoint: graphqlEndpoint,
			}),
		gen.If(flowstate.NeedsLocationProfileCreation, eval.WrapWithEval("create_location_profile",
			locationprofile.CreateStep{
				GraphQLEndpoint:         graphqlEndpoint,
				Model:                   model,
				MaxReflectionIterations: maxReflectionIterations,
			})),
	)
	resolver := intent.NewRouter("chat", "create_campaign", "location_profile_chat", "create_location_profile").
		On("create_campaign", campaignFlow).
		On("location_profile_chat", locationProfileChatFlow).
		On("create_location_profile", locationProfileFlow).
		Default(chatFlow)
	return gen.Agent{Resolver: resolver}
}
