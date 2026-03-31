package step

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/daniel-dihardja/gentic-agents/internal/platform/graphql"
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
	"github.com/daniel-dihardja/gentic/pkg/gentic/react"
)

// LocationProfileChatSystemPrompt is the ReAct system prompt for discussing and editing the location profile.
const LocationProfileChatSystemPrompt = `You help restaurant marketers view and refine their **location profile** — a structured marketing briefing used for Instagram content planning.

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

const fetchLocationProfileInputSchema = `{
  "type": "object",
  "description": "No parameters; location and analytics context come from the request.",
  "properties": {},
  "additionalProperties": false
}`

const updateLocationProfileInputSchema = `{
  "type": "object",
  "properties": {
    "summary": {
      "type": "string",
      "description": "Full location profile text to persist (markdown sections as used in the product)."
    }
  },
  "required": ["summary"],
  "additionalProperties": false
}`

// FetchLocationProfileTool returns a ReAct tool that loads the location profile via GraphQL and syncs metadata.
func FetchLocationProfileTool(graphqlEndpoint string) react.Tool {
	return react.NewToolWithState(
		"fetch_location_profile",
		"Loads the saved location profile summary for the current location_id and analytics_id from the request context.",
		json.RawMessage(fetchLocationProfileInputSchema),
		func(state *gen.State, input json.RawMessage) (json.RawMessage, error) {
			_ = input
			locationID, analyticsID, ok := requiredLocationIDs(state, "fetch location profile")
			if !ok {
				return nil, fmt.Errorf("location_id and analytics_id are required in the request")
			}
			ctx := context.Background()
			profile, err := graphql.FetchLocationProfile(ctx, graphqlEndpoint, locationID, analyticsID)
			if err != nil {
				return nil, err
			}
			if profile == nil || strings.TrimSpace(profile.Summary) == "" {
				state.DeleteMetadata(metadataKeyLocationProfile)
				return json.Marshal(map[string]interface{}{
					"exists":  false,
					"id":      "",
					"summary": "",
				})
			}
			state.SetMetadata(metadataKeyLocationProfile, profile)
			return json.Marshal(map[string]interface{}{
				"exists":  true,
				"id":      string(profile.ID),
				"summary": profile.Summary,
			})
		},
	)
}

// UpdateLocationProfileTool returns a ReAct tool that persists the location profile and updates metadata.
func UpdateLocationProfileTool(graphqlEndpoint string) react.Tool {
	return react.NewToolWithState(
		"update_location_profile",
		"Saves the full location profile summary to the database for the current location and analytics run.",
		json.RawMessage(updateLocationProfileInputSchema),
		func(state *gen.State, input json.RawMessage) (json.RawMessage, error) {
			var params struct {
				Summary string `json:"summary"`
			}
			if err := json.Unmarshal(input, &params); err != nil {
				return nil, fmt.Errorf("invalid input: %w", err)
			}
			summary := strings.TrimSpace(params.Summary)
			if summary == "" {
				return nil, fmt.Errorf("summary must be non-empty")
			}
			locationID, analyticsID, ok := requiredLocationIDs(state, "update location profile")
			if !ok {
				return nil, fmt.Errorf("location_id and analytics_id are required in the request")
			}
			ctx := context.Background()
			if err := graphql.SaveLocationProfile(ctx, graphqlEndpoint, locationID, analyticsID, summary); err != nil {
				return nil, err
			}
			if analyticsID != "0" {
				_ = graphql.SaveLocationProfile(ctx, graphqlEndpoint, locationID, "0", summary)
			}
			profileRow, err := graphql.FetchLocationProfile(ctx, graphqlEndpoint, locationID, analyticsID)
			if err != nil {
				return nil, err
			}
			if profileRow != nil {
				state.SetMetadata(metadataKeyLocationProfile, profileRow)
			} else {
				state.SetMetadata(metadataKeyLocationProfile, &graphql.LocationProfile{Summary: summary})
			}
			idStr := ""
			if profileRow != nil {
				idStr = string(profileRow.ID)
			}
			return json.Marshal(map[string]interface{}{
				"updated": true,
				"id":      idStr,
			})
		},
	)
}
