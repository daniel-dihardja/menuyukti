package locationprofile

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/daniel-dihardja/gentic-agents/internal/agent/flowstate"
	"github.com/daniel-dihardja/gentic-agents/internal/agent/toolutil"
	"github.com/daniel-dihardja/gentic-agents/internal/platform/graphql"
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

Follow the ReAct format from your instructions: Thought, Action / Action Input, or Final Answer.`

// FetchProfileInput has no parameters; location/analytics context comes from the request.
type FetchProfileInput struct{}

// UpdateProfileInput is the input to update_location_profile.
type UpdateProfileInput struct {
	Summary string `json:"summary" schema:"required"`
}

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

func fetchProfileHandler(endpoint string) func(*gen.State, json.RawMessage) (json.RawMessage, error) {
	return func(state *gen.State, _ json.RawMessage) (json.RawMessage, error) {
		locationID, analyticsID, ok := flowstate.RequiredLocationIDs(state, "fetch location profile")
		if !ok {
			return nil, fmt.Errorf("location_id and analytics_id are required in the request")
		}
		ctx := context.Background()
		profile, err := graphql.FetchLocationProfile(ctx, endpoint, locationID, analyticsID)
		if err != nil {
			return nil, err
		}
		if profile == nil || strings.TrimSpace(profile.Summary) == "" {
			state.DeleteMetadata(flowstate.KeyLocationProfile)
			return json.Marshal(map[string]interface{}{
				"exists":  false,
				"id":      "",
				"summary": "",
			})
		}
		state.SetMetadata(flowstate.KeyLocationProfile, profile)
		return json.Marshal(map[string]interface{}{
			"exists":  true,
			"id":      string(profile.ID),
			"summary": profile.Summary,
		})
	}
}

func updateProfileHandler(endpoint string) func(*gen.State, json.RawMessage) (json.RawMessage, error) {
	return func(state *gen.State, input json.RawMessage) (json.RawMessage, error) {
		var params UpdateProfileInput
		if err := json.Unmarshal(input, &params); err != nil {
			return nil, fmt.Errorf("invalid input: %w", err)
		}
		summary := strings.TrimSpace(params.Summary)
		if summary == "" {
			return nil, fmt.Errorf("summary must be non-empty")
		}
		locationID, analyticsID, ok := flowstate.RequiredLocationIDs(state, "update location profile")
		if !ok {
			return nil, fmt.Errorf("location_id and analytics_id are required in the request")
		}
		ctx := context.Background()
		if err := graphql.SaveLocationProfile(ctx, endpoint, locationID, analyticsID, summary); err != nil {
			return nil, err
		}
		profileRow, err := graphql.FetchLocationProfile(ctx, endpoint, locationID, analyticsID)
		if err != nil {
			return nil, err
		}
		if profileRow != nil {
			state.SetMetadata(flowstate.KeyLocationProfile, profileRow)
		} else {
			state.SetMetadata(flowstate.KeyLocationProfile, &graphql.LocationProfile{Summary: summary})
		}
		idStr := ""
		if profileRow != nil {
			idStr = string(profileRow.ID)
		}
		return json.Marshal(map[string]interface{}{
			"updated": true,
			"id":      idStr,
		})
	}
}
