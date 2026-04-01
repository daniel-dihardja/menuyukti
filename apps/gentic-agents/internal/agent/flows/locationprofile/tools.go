package locationprofile

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/daniel-dihardja/gentic-agents/internal/agent/flowstate"
	"github.com/daniel-dihardja/gentic-agents/internal/platform/graphql"
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
)

// FetchProfileInput has no parameters; location/analytics context comes from the request.
type FetchProfileInput struct{}

// UpdateProfileInput is the input to update_location_profile.
type UpdateProfileInput struct {
	Summary string `json:"summary" schema:"required"`
}

func fetchProfileHandler(endpoint string) func(context.Context, *gen.State, json.RawMessage) (json.RawMessage, error) {
	return func(ctx context.Context, state *gen.State, _ json.RawMessage) (json.RawMessage, error) {
		locationID, analyticsID, ok := flowstate.RequiredLocationIDs(state, "fetch location profile")
		if !ok {
			return nil, fmt.Errorf("location_id and analytics_id are required in the request")
		}
		ctx = graphql.GraphQLContext(ctx, state)
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

func updateProfileHandler(endpoint string) func(context.Context, *gen.State, json.RawMessage) (json.RawMessage, error) {
	return func(ctx context.Context, state *gen.State, input json.RawMessage) (json.RawMessage, error) {
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
		ctx = graphql.GraphQLContext(ctx, state)
		savedID, err := graphql.SaveLocationProfile(ctx, endpoint, locationID, analyticsID, summary)
		if err != nil {
			return nil, err
		}
		if savedID != "" {
			state.SetMetadata(flowstate.KeyLocationProfile, &graphql.LocationProfile{ID: graphql.ID(savedID), Summary: summary})
		} else {
			state.SetMetadata(flowstate.KeyLocationProfile, &graphql.LocationProfile{Summary: summary})
		}
		return json.Marshal(map[string]interface{}{
			"updated": true,
			"id":      savedID,
		})
	}
}
