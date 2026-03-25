package step

import (
	"context"
	"fmt"

	"github.com/daniel-dihardja/gentic-agents/internal/platform/graphql"
	"github.com/daniel-dihardja/gentic/pkg/gentic"
)

// CheckLocationProfileStep loads the location profile for the request's location and analytics run.
// It is the source of truth for metadata["_location_profile"]: set when the API returns a profile,
// deleted when none exists; [NeedsLocationProfileCreation] and [CreateLocationProfileStep] rely on that.
type CheckLocationProfileStep struct {
	GraphQLEndpoint string
}

// Run implements gentic.Step.
func (s CheckLocationProfileStep) Run(ctx context.Context, state *gentic.State) error {
	meta := state.SecureMetadata()
	locationID, err := meta.GetID("location_id")
	if err != nil {
		state.Output = "Cannot check location profile: location_id and analytics_id are required in the request."
		return nil
	}
	analyticsID, err := meta.GetID("analytics_id")
	if err != nil {
		state.Output = "Cannot check location profile: location_id and analytics_id are required in the request."
		return nil
	}

	if state.Metadata == nil {
		state.Metadata = make(map[string]interface{})
	}

	profile, err := graphql.FetchLocationProfile(ctx, s.GraphQLEndpoint, locationID, analyticsID)
	if err != nil {
		return err
	}
	if profile == nil {
		delete(state.Metadata, "_location_profile")
		state.Output = "No location profile found for this location and analytics run."
		return nil
	}

	state.Metadata["_location_profile"] = profile
	state.Output = fmt.Sprintf(
		"A location profile exists (id=%s). Summary: %s",
		string(profile.ID),
		profile.Summary,
	)
	return nil
}
