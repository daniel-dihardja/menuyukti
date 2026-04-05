package promotioncandidates

import (
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
	"github.com/daniel-dihardja/gentic/pkg/gentic/react"
)

const promotionCandidatesReActSystemPrompt = `You help restaurant marketers work with **promotion candidates** derived from menu engineering data (BCG-style matrix) and weekly demand heatmaps.

The **saved campaign brief** (theme, tone, target audience, posting cadence) is the strategic context for this campaign when it exists in the system. Creation loads it automatically when possible so candidate lists and day patterns align with that strategy—without inventing menu items.

You have two tools:

- **fetch_promotion_candidates** — Load **saved** promotion candidates (insights + matrix rows) for this chat's **campaign_id** from the database. Use when the user asks about previously saved candidates or you need grounded data without regenerating.
- **create_promotion_candidates** — Derive **stars**, **plow_horses**, **puzzles**, and **day_patterns** from matrix and heatmaps, then **save** them to this campaign in one step. Requires **campaign_id** in the request. The server loads the **campaign brief** (when available), then matrix and heatmaps. Do not invent menu items.

Workflow:

1. When the user wants to **create**, **generate**, or **refresh** promotion candidates: call **create_promotion_candidates** once (it saves to the campaign automatically).
2. When the user asks about **saved** candidates only: call **fetch_promotion_candidates** first.
3. Keep chat replies **short**; full structured lists are in tool results and the UI artifact where applicable.

If a tool returns an **error** field, explain what went wrong and what the user can do next.`

// NewChatReactActor returns a ReAct flow for interactive promotion-candidate analytics (fetch saved / create).
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
				"create_promotion_candidates",
				"Derives promotion insights from menu engineering matrix and heatmaps, then saves them to the campaign. Requires campaign_id. When a campaign brief exists for that campaign, analysis aligns with it.",
				gen.SchemaFromStruct(CreatePromotionCandidatesInput{}),
				createPromotionCandidatesHandler(model, graphqlEndpoint),
				EnsureCampaignBrief(graphqlEndpoint),
				EnsureAnalyticsInput(graphqlEndpoint),
			),
		),
	)
	return actor.Flow()
}
