package gentic

import (
	"context"

	"github.com/daniel-dihardja/gentic-agents/internal/agent/step"
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
	"github.com/daniel-dihardja/gentic/pkg/gentic/eval"
	"github.com/daniel-dihardja/gentic/pkg/gentic/intent"
	"github.com/daniel-dihardja/gentic/pkg/gentic/react"
	"github.com/daniel-dihardja/gentic/pkg/steps"
)

// BuildAgent wires the Gentic SDK with a default chat flow behind intent routing.
// The default chat uses step.DefaultChatSystemPrompt.
func BuildAgent(model, graphqlEndpoint string, maxReflectionIterations int) gen.Agent {
	chatFlow := gen.NewFlow(steps.ChatStep{
		Model:        model,
		SystemPrompt: step.DefaultChatSystemPrompt,
	})
	campaignFlow := gen.NewFlow(
		eval.WrapWithEval("check_location_profile",
			step.CheckLocationProfileStep{
				GraphQLEndpoint: graphqlEndpoint,
			}),
		gen.If(step.NeedsLocationProfileCreation, eval.WrapWithEval("create_location_profile",
			step.CreateLocationProfileStep{
				GraphQLEndpoint:         graphqlEndpoint,
				Model:                   model,
				MaxReflectionIterations: maxReflectionIterations,
			})),
		eval.WrapWithEval("create_campaign_brief",
			step.CreateCampaignBriefStep{
				Model:                   model,
				MaxReflectionIterations: maxReflectionIterations,
			}),
		gen.Parallel(
			eval.WrapWithEval("create_post_schedule",
				step.CreatePostScheduleStep{
					Model:                   model,
					MaxReflectionIterations: maxReflectionIterations,
				}),
			eval.WrapWithEval("fetch_promotion_items",
				step.FetchPromotionItemsStep{
					GraphQLEndpoint: graphqlEndpoint,
				}),
		),
		eval.WrapWithEval("select_promotion_items",
			step.SelectPromotionItemsStep{
				Model:                   model,
				MaxReflectionIterations: maxReflectionIterations,
			}),
		eval.WrapWithEval("assign_post_formats",
			step.AssignPostFormatsStep{
				Model:                   model,
				MaxReflectionIterations: maxReflectionIterations,
			}),
		eval.WrapWithEval("save_campaign",
			step.SaveCampaignStep{
				GraphQLEndpoint: graphqlEndpoint,
			}),
	)
	locationProfileChatFlow := react.NewReactActor(
		react.WithModel(model),
		react.WithSystemPrompt(step.LocationProfileChatSystemPrompt),
		react.WithTools(
			step.FetchLocationProfileTool(graphqlEndpoint),
			step.UpdateLocationProfileTool(graphqlEndpoint),
		),
	).Resolve(context.Background(), nil)
	resolver := intent.NewRouter("chat", "create_campaign", "location_profile_chat").
		On("create_campaign", campaignFlow).
		On("location_profile_chat", locationProfileChatFlow).
		Default(chatFlow)
	return gen.Agent{Resolver: resolver}
}
