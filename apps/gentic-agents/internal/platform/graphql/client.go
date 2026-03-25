package graphql

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

const fetchLocationProfileQuery = `query FetchLocationProfile($locationId: ID!, $analyticsRunId: ID!) {
  locationProfile(locationId: $locationId, analyticsRunId: $analyticsRunId) {
    id
    summary
  }
}`

// LocationProfile is the subset of fields returned by locationProfile.
type LocationProfile struct {
	ID      int64  `json:"id"`
	Summary string `json:"summary"`
}

type gqlRequest struct {
	Query     string                 `json:"query"`
	Variables map[string]interface{} `json:"variables"`
}

type gqlResponse struct {
	Data   *gqlData   `json:"data"`
	Errors []gqlError `json:"errors"`
}

type gqlData struct {
	LocationProfile *LocationProfile `json:"locationProfile"`
}

type gqlError struct {
	Message string `json:"message"`
}

// FetchLocationProfile calls locationProfile(locationId, analyticsRunId).
// Returns nil, nil when the server returns null (profile not yet created).
func FetchLocationProfile(ctx context.Context, endpoint, locationID, analyticsRunID string) (*LocationProfile, error) {
	body, err := json.Marshal(gqlRequest{
		Query: fetchLocationProfileQuery,
		Variables: map[string]interface{}{
			"locationId":       locationID,
			"analyticsRunId": analyticsRunID,
		},
	})
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 15 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return nil, fmt.Errorf("graphql: unexpected status %d", res.StatusCode)
	}

	var out gqlResponse
	if err := json.NewDecoder(res.Body).Decode(&out); err != nil {
		return nil, err
	}
	if len(out.Errors) > 0 {
		return nil, fmt.Errorf("graphql: %s", out.Errors[0].Message)
	}
	if out.Data == nil {
		return nil, nil
	}
	return out.Data.LocationProfile, nil
}
