package flowstate

import (
	"strings"

	"github.com/daniel-dihardja/gentic-agents/internal/platform/graphql"
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
)

// LocationProfileFromMetadata retrieves the location profile from state.
func LocationProfileFromMetadata(state *gen.State) (*graphql.LocationProfile, bool) {
	if state == nil {
		return nil, false
	}
	v, ok := state.GetMetadata(KeyLocationProfile)
	if !ok {
		return nil, false
	}
	p, ok := v.(*graphql.LocationProfile)
	if !ok || p == nil {
		return nil, false
	}
	return p, true
}

// HasValidPersistedLocationProfile checks if a non-nil *graphql.LocationProfile
// with non-empty Summary exists in metadata (set after CheckLocationProfileStep).
func HasValidPersistedLocationProfile(state *gen.State) bool {
	if state == nil {
		return false
	}
	v, ok := state.GetMetadata(KeyLocationProfile)
	if !ok {
		return false
	}
	p, ok := v.(*graphql.LocationProfile)
	if !ok || p == nil {
		return false
	}
	return strings.TrimSpace(p.Summary) != ""
}

// NeedsLocationProfileCreation returns true iff we should run generation and persistence
// (no valid profile in metadata). For use with gen.If in flow composition.
func NeedsLocationProfileCreation(state *gen.State) bool {
	return !HasValidPersistedLocationProfile(state)
}
