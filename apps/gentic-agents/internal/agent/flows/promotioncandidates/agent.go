package promotioncandidates

import (
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
	"github.com/daniel-dihardja/gentic/pkg/gentic/react"
)

const promotionCandidatesReActSystemPrompt = `You help restaurant marketers work with **promotion candidates** derived from menu engineering data (BCG-style matrix) and weekly demand heatmaps.

You have three tools:

- **fetch_promotion_candidates** — Load **saved** promotion candidates (insights + matrix rows) for this chat's **campaign_id** from the database. Use when the user asks about previously saved candidates or you need grounded data without regenerating.
- **generate_promotion_candidates** — Run the structured analysis to produce **stars**, **plow_horses**, **puzzles**, and **day_patterns**. The server loads matrix and heatmaps automatically when needed. Do not invent menu items.
- **save_promotion_candidates** — Persist insights and matrix rows to the campaign when **campaign_id** is present in the request. If campaign_id is missing, explain that saving is not possible until the client provides it.

Workflow:

1. When the user wants to **create**, **generate**, or **refresh** promotion candidates: call **generate_promotion_candidates**, then **save_promotion_candidates** if they need the results stored (and campaign_id is available).
2. When the user asks about **saved** candidates: call **fetch_promotion_candidates** first.
3. Keep chat replies **short**; full structured lists are in tool results and the UI artifact where applicable.

If a tool returns an **error** field, explain what went wrong and what the user can do next.`

// NewChatReactActor returns a ReAct flow for interactive promotion-candidate analytics (fetch saved / generate / save).
func NewChatReactActor(model, graphqlEndpoint string) gen.Flow {
	actor := react.NewReactActor(
		react.WithModel(model),
		react.WithSystemPrompt(promotionCandidatesReActSystemPrompt),
		react.WithMaxSteps(12),
		react.WithTools(
			react.NewToolWithState(
				"fetch_promotion_candidates",
				"Loads saved promotion candidates JSON for the current campaign_id from the database (insights + matrix_items).",
				gen.SchemaFromStruct(FetchPromotionCandidatesInput{}),
				fetchPromotionCandidatesHandler(graphqlEndpoint),
			),
			react.NewToolWithState(
				"generate_promotion_candidates",
				"Derives structured promotion insights from menu engineering matrix and heatmaps (loaded automatically if needed).",
				gen.SchemaFromStruct(GenerateCandidatesInput{}),
				generateCandidatesHandler(model),
				EnsureAnalyticsInput(graphqlEndpoint),
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
