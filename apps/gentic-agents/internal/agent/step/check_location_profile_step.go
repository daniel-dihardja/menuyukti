package step

import (
	"context"
	"fmt"
	"strconv"

	"github.com/daniel-dihardja/gentic-agents/internal/platform/graphql"
	"github.com/daniel-dihardja/gentic/pkg/gentic"
)

// CheckLocationProfileStep loads the location profile for the request's location and analytics run.
type CheckLocationProfileStep struct {
	GraphQLEndpoint string
}

// Run implements gentic.Step.
func (s CheckLocationProfileStep) Run(state *gentic.State) error {
	meta := state.SecureMetadata()
	locVal, okLoc := meta.Get("location_id")
	anaVal, okAna := meta.Get("analytics_id")
	if !okLoc || !okAna {
		state.Output = "Cannot check location profile: location_id and analytics_id are required in the request."
		return nil
	}

	locationID, err := formatID(locVal)
	if err != nil {
		state.Output = fmt.Sprintf("Invalid location_id: %v", err)
		return nil
	}
	analyticsID, err := formatID(anaVal)
	if err != nil {
		state.Output = fmt.Sprintf("Invalid analytics_id: %v", err)
		return nil
	}

	if state.Metadata == nil {
		state.Metadata = make(map[string]interface{})
	}

	ctx := context.Background()
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

func formatID(v interface{}) (string, error) {
	switch x := v.(type) {
	case int64:
		return strconv.FormatInt(x, 10), nil
	case int:
		return strconv.Itoa(x), nil
	case float64:
		return strconv.FormatInt(int64(x), 10), nil
	case string:
		if x == "" {
			return "", fmt.Errorf("empty id")
		}
		return x, nil
	default:
		return "", fmt.Errorf("unsupported type %T", v)
	}
}
