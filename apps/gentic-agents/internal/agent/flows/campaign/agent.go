package campaign

import (
	"context"

	"github.com/daniel-dihardja/gentic-agents/internal/agent/toolutil"
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
	"github.com/daniel-dihardja/gentic/pkg/gentic/react"
)

const briefChatSystemPrompt = `You help restaurant marketers view and refine their **campaign brief** — the strategy summary used for Instagram promotion planning.

The brief has exactly four fields:
- **campaign_theme** — one clear sentence for the creative theme
- **tone** — brand voice in a few words
- **target_audience** — who we are speaking to (1–3 sentences)
- **posting_cadence** — recommended cadence in plain language (not post-level dates)

You have three tools:
- **fetch_campaign_brief** — Load the current saved brief from the database for this chat's campaign_id. Call this first before answering questions about the brief or proposing edits (unless the user only asked to create a new brief from scratch).
- **update_campaign_brief** — Save all four brief fields to the database for the current campaign, location, and analytics run.
- **create_campaign_brief** — Generate a **new** campaign brief from the location profile using AI, then save it to the database. Always use this when the user asks to create, generate, or build a campaign brief. It always produces a fresh brief; do not call **fetch_campaign_brief** first for creation-only requests. The tool result only confirms success and an id; **full field values appear in the Campaign brief artifact / planning UI**, not in the tool output.

Workflow:
1. When the user asks to **create** or **generate** a campaign brief: call **create_campaign_brief** once, then reply with **at most one short sentence** (e.g. that it was saved and they can read it in the **Campaign brief** / planning panel). **Do not** paste or paraphrase theme, tone, audience, or cadence in chat.
2. Whenever the user asks to view, discuss, or change any part of an existing brief (without asking to create from scratch): call **fetch_campaign_brief** first (unless you already have fresh data from this same turn).
3. When the user asks to change or update any field: apply the change immediately — call **update_campaign_brief** without asking for confirmation. Pass **all four** fields every time; merge the user's change with the current values from **fetch_campaign_brief** for fields they did not ask to change.
4. After saving, confirm what changed with your final response.`

// NewChatReactActor returns a configured ReAct actor for interactive campaign brief editing.
func NewChatReactActor(model, graphqlEndpoint string, maxReflectionIterations int) gen.Flow {
	actor := react.NewReactActor(
		react.WithModel(model),
		react.WithSystemPrompt(briefChatSystemPrompt),
		react.WithMaxSteps(12),
		react.WithTools(
			react.NewToolWithState(
				"fetch_campaign_brief",
				"Loads the saved campaign brief for the current campaign_id from the request context.",
				toolutil.SchemaFromStruct(FetchBriefInput{}),
				fetchBriefHandler(graphqlEndpoint),
			),
			react.NewToolWithState(
				"create_campaign_brief",
				"Generates a new campaign brief from the location profile and saves it to the database for the current campaign_id, location_id, and analytics_id. On success returns created=true and id only; full values are shown in the UI artifact, not in this response.",
				toolutil.SchemaFromStruct(CreateBriefInput{}),
				createBriefHandler(graphqlEndpoint, model, maxReflectionIterations),
				EnsureLocationProfile(graphqlEndpoint),
			),
			react.NewToolWithState(
				"update_campaign_brief",
				"Saves all four campaign brief fields to the database for the current campaign, location, and analytics run.",
				toolutil.SchemaFromStruct(UpdateBriefInput{}),
				updateBriefHandler(graphqlEndpoint),
			),
		),
	)
	return actor.Resolve(context.Background(), nil)
}
