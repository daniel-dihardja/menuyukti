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

You have three tools:
- **fetch_location_profile** — Load the current saved profile from the database for this chat's location and analytics run. Call this first before answering questions about the profile or proposing edits (unless the user only asked to create a new profile from scratch).
- **update_location_profile** — Save a new full profile text (the complete summary string) to the database.
- **create_location_profile** — Generate and persist a **new** location profile from venue and operating data. Always use this when the user asks to create, generate, or build a location profile. It always writes a fresh profile (overwriting any prior one for this run); do not call **fetch_location_profile** first for creation-only requests. The tool result only confirms success and an id; the **full profile text appears in the Location profile artifact panel**, not in the tool output.

Workflow:
1. When the user asks to **create** or **generate** a location profile: call **create_location_profile** once, then reply with **at most one short sentence** (e.g. that it was saved and they can read it in the **Location profile** panel). **Do not** paste or paraphrase the four sections, headings (**Venue Identity**, **Audience Persona**, **Traffic & Timing**, **Content & Tone Signals**), or any part of the profile body in chat.
2. Whenever the user asks to view, discuss, or change any part of an existing profile (without asking to create from scratch): call **fetch_location_profile** first (unless you already have fresh data from this same turn).
3. When the user asks to change, rename, or update any part of the profile: apply the change immediately — call **update_location_profile** without asking for confirmation. Pass the **entire** updated summary as one string (all four sections); change only what the user requested and keep the rest consistent. If the user asked for a partial replacement, still pass the full document they want stored.
4. After saving, confirm what changed with your final response.`

// NewChatReactActor returns a configured ReAct actor for location profile interactive editing.
func NewChatReactActor(model, graphqlEndpoint string, maxReflectionIterations int) gen.Flow {
	actor := react.NewReactActor(
		react.WithModel(model),
		react.WithSystemPrompt(chatSystemPrompt),
		react.WithMaxSteps(16),
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
			react.NewToolWithState(
				"create_location_profile",
				"Generates and saves a new location profile from venue and operating data for the current location_id and analytics_id. Always creates a fresh profile; does not reuse an existing saved profile. On success returns created=true and id only; the full profile is shown in the UI artifact, not in this response.",
				toolutil.SchemaFromStruct(CreateProfileInput{}),
				createProfileHandler(graphqlEndpoint, model, maxReflectionIterations),
			),
		),
	)
	return actor.Resolve(context.Background(), nil)
}
