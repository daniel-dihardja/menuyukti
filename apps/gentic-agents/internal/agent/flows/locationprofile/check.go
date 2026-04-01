package locationprofile

import (
	"context"
	"fmt"

	"github.com/daniel-dihardja/gentic-agents/internal/agent/flowstate"
	"github.com/daniel-dihardja/gentic-agents/internal/agent/step"
	"github.com/daniel-dihardja/gentic-agents/internal/platform/graphql"
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
)

// ProfileLoader loads a location profile. When nil, [graphql.FetchLocationProfile] is used.
type ProfileLoader interface {
	Load(ctx context.Context, endpoint, locationID, analyticsID string) (*graphql.LocationProfile, error)
}

// CheckStep loads the location profile for the request's location and analytics run.
// It is the source of truth for the location profile metadata: set when the API returns a profile,
// deleted when none exists; [flowstate.NeedsLocationProfileCreation] and [CreateStep] rely on that.
type CheckStep struct {
	GraphQLEndpoint string
	Loader          ProfileLoader
}

func (s CheckStep) loadProfile(ctx context.Context, endpoint, locationID, analyticsID string) (*graphql.LocationProfile, error) {
	if s.Loader != nil {
		return s.Loader.Load(ctx, endpoint, locationID, analyticsID)
	}
	return graphql.FetchLocationProfile(ctx, endpoint, locationID, analyticsID)
}

// Run implements gen.Step.
func (s CheckStep) Run(ctx context.Context, state *gen.State) error {
	locationID, analyticsID, ok := flowstate.RequiredLocationIDs(state, "check location profile")
	if !ok {
		return nil
	}

	n := gen.NotifierFromContext(ctx)
	n.Notify("check_location_profile", gen.ActivityRunning, "Checking location profile", gen.WithTransient(true))

	profile, err := s.loadProfile(ctx, s.GraphQLEndpoint, locationID, analyticsID)
	if err != nil {
		return err
	}
	if profile == nil {
		state.DeleteMetadata(flowstate.KeyLocationProfile)
		state.Output = "No location profile found for this location and analytics run."
		n.Notify("check_location_profile", gen.ActivityDone, "No saved profile for this run")
		return nil
	}

	state.SetMetadata(flowstate.KeyLocationProfile, profile)
	state.Output = fmt.Sprintf(
		"A location profile exists (id=%s). Summary: %s",
		string(profile.ID),
		profile.Summary,
	)
	n.Notify("check_location_profile", gen.ActivityDone, "Location profile loaded", gen.WithDetail(string(profile.ID)))
	step.EmitPlanningProgress(ctx, state)
	return nil
}
