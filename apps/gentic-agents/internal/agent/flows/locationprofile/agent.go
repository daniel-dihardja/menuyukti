package locationprofile

import (
	"context"

	"github.com/daniel-dihardja/gentic-agents/internal/agent/toolutil"
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
	"github.com/daniel-dihardja/gentic/pkg/gentic/react"
)

const chatSystemPrompt = `You help restaurant marketers view and refine their **location profile** — a structured marketing briefing used for Instagram content planning.

The profile uses exactly four labelled sections:
- **Venue Identity**
- **Audience Persona**
- **Traffic & Timing**
- **Content & Tone Signals**

You have two tools:
- **fetch_location_profile** — Load the current saved profile from the database for this chat's location and analytics run. Call this first before answering questions about the profile or proposing edits.
- **update_location_profile** — Save a new full profile text (the complete summary string). Only call this after the user has clearly agreed to persist changes (e.g. they confirm they want to save, apply, or replace the profile).

Workflow:
1. If the user asks about the profile, wants to discuss it, or to change it: call **fetch_location_profile** first (unless you already have fresh data from this same turn).
2. Discuss improvements in natural language; quote or paraphrase sections as needed.
3. Only call **update_location_profile** when the user explicitly confirms they want the revised text saved. Pass the **entire** updated summary as one string (all four sections), not a partial edit, unless the user asked for a partial replacement — in that case still pass the full document they want stored.

Follow the ReAct format from your instructions: Thought, Action / Action Input, or Final Answer.
Put each label on its own line. Plain labels (Action: tool_name) and markdown (**Action:** tool_name) are both accepted.
After saving with update_location_profile, end the turn with a line starting **Final Answer:** (or Final Answer:) and a short confirmation to the user — do not leave the response without Action or Final Answer.
For tools with no parameters (e.g. fetch_location_profile), use Action Input: {} or omit Action Input (the runtime defaults to {}).`

// NewChatReactActor returns a configured ReAct actor for location profile interactive editing.
func NewChatReactActor(model, graphqlEndpoint string) gen.Flow {
	actor := react.NewReactActor(
		react.WithModel(model),
		react.WithSystemPrompt(chatSystemPrompt),
		react.WithTools(
			react.NewToolWithState(
				"fetch_location_profile",
				"Loads the saved location profile summary for the current location_id and analytics_id from the request context.",
				toolutil.SchemaFromStruct(FetchProfileInput{}),
				fetchProfileHandler(graphqlEndpoint),
			),
			react.NewToolWithState(
				"update_location_profile",
				"Saves the full location profile summary to the database for the current location and analytics run.",
				toolutil.SchemaFromStruct(UpdateProfileInput{}),
				updateProfileHandler(graphqlEndpoint),
			),
		),
	)
	return actor.Resolve(context.Background(), nil)
}
