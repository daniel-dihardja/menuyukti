package step

import (
	"context"
	"fmt"

	"github.com/daniel-dihardja/gentic-agents/internal/agent/flowstate"
	"github.com/daniel-dihardja/gentic-agents/internal/platform/graphql"
	"github.com/daniel-dihardja/gentic/pkg/gentic"
)

// ProfileLoader loads a location profile for [CheckLocationProfileStep]. When nil, [graphql.FetchLocationProfile] is used.
type ProfileLoader interface {
	Load(ctx context.Context, endpoint, locationID, analyticsID string) (*graphql.LocationProfile, error)
}

// CheckLocationProfileStep loads the location profile for the request's location and analytics run.
// It is the source of truth for metadata["_location_profile"]: set when the API returns a profile,
// deleted when none exists; [NeedsLocationProfileCreation] and [CreateLocationProfileStep] rely on that.
type CheckLocationProfileStep struct {
	GraphQLEndpoint string
	Loader          ProfileLoader
}

func (s CheckLocationProfileStep) loadProfile(ctx context.Context, endpoint, locationID, analyticsID string) (*graphql.LocationProfile, error) {
	if s.Loader != nil {
		return s.Loader.Load(ctx, endpoint, locationID, analyticsID)
	}
	return graphql.FetchLocationProfile(ctx, endpoint, locationID, analyticsID)
}

// Run implements gentic.Step.
func (s CheckLocationProfileStep) Run(ctx context.Context, state *gentic.State) error {
	locationID, analyticsID, ok := flowstate.RequiredLocationIDs(state, "check location profile")
	if !ok {
		return nil
	}

	n := gentic.NotifierFromContext(ctx)
	n.Notify("check_location_profile", gentic.ActivityRunning, "Checking location profile", gentic.WithTransient(true))

	profile, err := s.loadProfile(ctx, s.GraphQLEndpoint, locationID, analyticsID)
	if err != nil {
		return err
	}
	if profile == nil {
		state.DeleteMetadata(flowstate.KeyLocationProfile)
		state.Output = "No location profile found for this location and analytics run."
		n.Notify("check_location_profile", gentic.ActivityDone, "No saved profile for this run")
		return nil
	}

	state.SetMetadata(flowstate.KeyLocationProfile, profile)
	state.Output = fmt.Sprintf(
		"A location profile exists (id=%s). Summary: %s",
		string(profile.ID),
		profile.Summary,
	)
	n.Notify("check_location_profile", gentic.ActivityDone, "Location profile loaded", gentic.WithDetail(string(profile.ID)))
	EmitPlanningProgress(ctx, state)
	return nil
}
