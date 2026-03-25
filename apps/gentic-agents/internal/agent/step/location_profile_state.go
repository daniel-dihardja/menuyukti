package step

import (
	"strings"

	"github.com/daniel-dihardja/gentic-agents/internal/platform/graphql"
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
)

// hasValidPersistedLocationProfile is the single interpretation of metadata after
// [CheckLocationProfileStep]: a non-nil *graphql.LocationProfile with non-empty Summary
// under metadataKeyLocationProfile means the backend already has a usable profile.
func hasValidPersistedLocationProfile(state *gen.State) bool {
	if state == nil || state.Metadata == nil {
		return false
	}
	v, ok := state.Metadata[metadataKeyLocationProfile]
	if !ok {
		return false
	}
	p, ok := v.(*graphql.LocationProfile)
	if !ok || p == nil {
		return false
	}
	return strings.TrimSpace(p.Summary) != ""
}

// NeedsLocationProfileCreation is for [gen.If] after [CheckLocationProfileStep].
// It returns true iff we should run generation and persistence (no valid profile in metadata).
func NeedsLocationProfileCreation(state *gen.State) bool {
	return !hasValidPersistedLocationProfile(state)
}
