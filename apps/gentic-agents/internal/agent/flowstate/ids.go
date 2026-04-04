package flowstate

import (
	"fmt"

	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
)

// RequiredLocationIDs extracts location_id and analytics_id from state metadata.
func RequiredLocationIDs(state *gen.State, operation string) (locationID, analyticsID string, err error) {
	if state == nil {
		return "", "", fmt.Errorf("cannot %s: invalid state", operation)
	}
	meta := state.SecureMetadata()
	locationID, err = meta.GetID("location_id")
	if err != nil {
		return "", "", fmt.Errorf("cannot %s: location_id and analytics_id are required in the request", operation)
	}
	analyticsID, err = meta.GetID("analytics_id")
	if err != nil {
		return "", "", fmt.Errorf("cannot %s: location_id and analytics_id are required in the request", operation)
	}
	return locationID, analyticsID, nil
}
