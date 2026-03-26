package step

import (
	"fmt"
	"strings"

	"github.com/daniel-dihardja/gentic-agents/internal/platform/graphql"
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
)

const metadataKeyLocationProfile = "_location_profile"

// requiredLocationIDs extracts location_id and analytics_id from state metadata.
// On failure it sets state.Output and returns ok false.
func requiredLocationIDs(state *gen.State, operation string) (locationID, analyticsID string, ok bool) {
	if state == nil {
		return "", "", false
	}
	meta := state.SecureMetadata()
	locationID, err := meta.GetID("location_id")
	if err != nil {
		state.Output = fmt.Sprintf("Cannot %s: location_id and analytics_id are required in the request.", operation)
		return "", "", false
	}
	analyticsID, err = meta.GetID("analytics_id")
	if err != nil {
		state.Output = fmt.Sprintf("Cannot %s: location_id and analytics_id are required in the request.", operation)
		return "", "", false
	}
	return locationID, analyticsID, true
}

// hasValidPersistedLocationProfile is the single interpretation of metadata after
// [CheckLocationProfileStep]: a non-nil *graphql.LocationProfile with non-empty Summary
// under metadataKeyLocationProfile means the backend already has a usable profile.
func hasValidPersistedLocationProfile(state *gen.State) bool {
	if state == nil {
		return false
	}
	v, ok := state.GetMetadata(metadataKeyLocationProfile)
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
