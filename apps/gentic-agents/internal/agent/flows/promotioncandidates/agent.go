package promotioncandidates

import (
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
	"github.com/daniel-dihardja/gentic/pkg/gentic/react"
)

const promotionCandidatesReActSystemPrompt = `You help restaurant marketers work with **promotion candidates** derived from menu engineering data (BCG-style matrix) and weekly demand heatmaps.

You have three tools:

- **fetch_analytics_data** — Load the menu engineering matrix and per-item heatmaps for the current location_id and analytics_id from the request. Call this **first** before generating or when the user asks about data that must be grounded in the latest numbers.
- **generate_promotion_candidates** — Run the structured analysis to produce **stars**, **plow_horses**, **puzzles**, and **day_patterns** (grounded in the fetched data). Do not invent menu items. Requires fetch_analytics_data to have run successfully in this session.
- **save_promotion_candidates** — Persist insights and matrix rows to the campaign when **campaign_id** is present in the request. If campaign_id is missing, explain that saving is not possible until the client provides it.

Workflow:

1. When the user wants to **create**, **generate**, or **refresh** promotion candidates: call **fetch_analytics_data**, then **generate_promotion_candidates**, then **save_promotion_candidates** if they need the results stored (and campaign_id is available).
2. When the user asks **questions** about candidates or items: call **fetch_analytics_data** if you need fresh grounding; use **generate_promotion_candidates** only when they want a new or updated derivation.
3. Keep chat replies **short**; full structured lists are in tool results and the UI artifact where applicable. Do not paste long JSON arrays in the final reply unless the user explicitly asks.

If a tool returns an **error** field, explain what went wrong and what the user can do next.`

// NewChatReactActor returns a ReAct flow for interactive promotion-candidate analytics (fetch / generate / save).
func NewChatReactActor(model, graphqlEndpoint string) gen.Flow {
	actor := react.NewReactActor(
		react.WithModel(model),
		react.WithSystemPrompt(promotionCandidatesReActSystemPrompt),
		react.WithMaxSteps(12),
		react.WithTools(
			react.NewToolWithState(
				"fetch_analytics_data",
				"Loads menu engineering matrix rows and menu heatmaps for the current location_id and analytics_id from the request. Call before generate.",
				gen.SchemaFromStruct(FetchAnalyticsInput{}),
				fetchAnalyticsHandler(graphqlEndpoint),
			),
			react.NewToolWithState(
				"generate_promotion_candidates",
				"Derives structured promotion insights (stars, plow_horses, puzzles, day_patterns) from data already loaded by fetch_analytics_data.",
				gen.SchemaFromStruct(GenerateCandidatesInput{}),
				generateCandidatesHandler(model),
			),
			react.NewToolWithState(
				"save_promotion_candidates",
				"Saves insights and matrix rows to the campaign when campaign_id is in the request metadata.",
				gen.SchemaFromStruct(SaveCandidatesInput{}),
				saveCandidatesHandler(graphqlEndpoint),
			),
		),
	)
	return actor.Flow()
}
