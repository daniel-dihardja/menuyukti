package campaign

import (
	"context"

	"github.com/daniel-dihardja/gentic-agents/internal/agent/flowstate"
	"github.com/daniel-dihardja/gentic-agents/internal/platform/graphql"
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
	"github.com/daniel-dihardja/gentic/pkg/gentic/react"
)

// EnsureLocationProfile loads the location profile into state when missing but required
// for tools that depend on it (e.g. create_campaign_brief). Mirrors the former inline
// check in createBriefHandler.
func EnsureLocationProfile(endpoint string) react.GuardFunc {
	return func(ctx context.Context, state *gen.State) error {
		if flowstate.HasValidPersistedLocationProfile(state) {
			return nil
		}
		ctx = graphql.GraphQLContext(ctx, state)
		locationID, analyticsID, err := flowstate.RequiredLocationIDs(state, "load location profile")
		if err != nil {
			return nil
		}
		profile, err := graphql.FetchLocationProfile(ctx, endpoint, locationID, analyticsID)
		if err == nil && profile != nil {
			state.SetMetadata(flowstate.KeyLocationProfile, profile)
		}
		return nil
	}
}
