package flowstate

import (
	"fmt"

	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
)

// RequiredLocationIDs extracts location_id and analytics_id from state metadata.
// On failure it sets state.Output and returns ok false.
func RequiredLocationIDs(state *gen.State, operation string) (locationID, analyticsID string, ok bool) {
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
