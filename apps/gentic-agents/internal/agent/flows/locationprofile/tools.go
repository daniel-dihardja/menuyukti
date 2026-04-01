package locationprofile

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
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

// CreateProfileInput has no parameters; location/analytics context comes from the request.
type CreateProfileInput struct{}

func createProfileHandler(endpoint, model string, maxReflectionIterations int) func(context.Context, *gen.State, json.RawMessage) (json.RawMessage, error) {
	step := CreateStep{
		GraphQLEndpoint:         endpoint,
		Model:                   model,
		MaxReflectionIterations: maxReflectionIterations,
	}
	return func(ctx context.Context, state *gen.State, _ json.RawMessage) (json.RawMessage, error) {
		state.DeleteMetadata(flowstate.KeyLocationProfile)
		if err := step.Run(ctx, state); err != nil {
			return nil, err
		}
		profile, ok := flowstate.LocationProfileFromMetadata(state)
		if !ok {
			return json.Marshal(map[string]interface{}{
				"created": false,
			})
		}
		return json.Marshal(map[string]interface{}{
			"created": true,
			"id":      string(profile.ID),
			"summary": profile.Summary,
		})
	}
}

func fetchProfileHandler(endpoint string) func(context.Context, *gen.State, json.RawMessage) (json.RawMessage, error) {
	return func(ctx context.Context, state *gen.State, _ json.RawMessage) (json.RawMessage, error) {
		locationID, analyticsID, ok := flowstate.RequiredLocationIDs(state, "fetch location profile")
		if !ok {
			slog.Warn("locationprofile tool: fetch_location_profile missing ids",
				"component", "gentic-agents.locationprofile")
			return nil, fmt.Errorf("location_id and analytics_id are required in the request")
		}
		ctx = graphql.GraphQLContext(ctx, state)
		profile, err := graphql.FetchLocationProfile(ctx, endpoint, locationID, analyticsID)
		if err != nil {
			slog.Error("locationprofile tool: fetch_location_profile graphql error",
				"component", "gentic-agents.locationprofile",
				"location_id", locationID, "analytics_id", analyticsID, "err", err)
			return nil, err
		}
		if profile == nil || strings.TrimSpace(profile.Summary) == "" {
			slog.Info("locationprofile tool: fetch_location_profile no profile row or empty summary",
				"component", "gentic-agents.locationprofile",
				"location_id", locationID, "analytics_id", analyticsID)
			state.DeleteMetadata(flowstate.KeyLocationProfile)
			return json.Marshal(map[string]interface{}{
				"exists":  false,
				"id":      "",
				"summary": "",
			})
		}
		state.SetMetadata(flowstate.KeyLocationProfile, profile)
		slog.Info("locationprofile tool: fetch_location_profile ok",
			"component", "gentic-agents.locationprofile",
			"location_id", locationID, "analytics_id", analyticsID,
			"profile_id", string(profile.ID), "summary_len", len(profile.Summary))
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
			slog.Warn("locationprofile tool: update_location_profile missing ids",
				"component", "gentic-agents.locationprofile")
			return nil, fmt.Errorf("location_id and analytics_id are required in the request")
		}
		ctx = graphql.GraphQLContext(ctx, state)
		slog.Info("locationprofile tool: update_location_profile saving",
			"component", "gentic-agents.locationprofile",
			"location_id", locationID, "analytics_id", analyticsID, "summary_len", len(summary))
		savedID, err := graphql.SaveLocationProfile(ctx, endpoint, locationID, analyticsID, summary)
		if err != nil {
			slog.Error("locationprofile tool: update_location_profile save failed",
				"component", "gentic-agents.locationprofile",
				"location_id", locationID, "analytics_id", analyticsID, "err", err)
			return nil, err
		}
		if savedID != "" {
			state.SetMetadata(flowstate.KeyLocationProfile, &graphql.LocationProfile{ID: graphql.ID(savedID), Summary: summary})
		} else {
			state.SetMetadata(flowstate.KeyLocationProfile, &graphql.LocationProfile{Summary: summary})
		}
		gen.NotifierFromContext(ctx).EmitData("location_profile_update", map[string]string{"summary": summary})
		slog.Info("locationprofile tool: update_location_profile saved",
			"component", "gentic-agents.locationprofile",
			"location_id", locationID, "analytics_id", analyticsID,
			"saved_id", savedID, "summary_len", len(summary))
		return json.Marshal(map[string]interface{}{
			"updated": true,
			"id":      savedID,
		})
	}
}
