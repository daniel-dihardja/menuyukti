package locationprofile

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
)

const (
	fetchLocationProfileQuery = `
query FetchLocationProfile($locationId: ID!, $analyticsRunId: ID!) {
  locationProfile(locationId: $locationId, analyticsRunId: $analyticsRunId) {
    id
    locationId
    analyticsRunId
    summary
    createdAt
    updatedAt
  }
}
`
	saveLocationProfileMutation = `
mutation SaveLocationProfile($locationId: ID!, $analyticsRunId: ID!, $summary: String!) {
  saveLocationProfile(locationId: $locationId, analyticsRunId: $analyticsRunId, summary: $summary) {
    id
    locationId
    analyticsRunId
    summary
    createdAt
    updatedAt
  }
}
`
)

// Service calls the GraphQL API for location_profile (see apps/graphql/schema/queries/location_profile.py
// and mutations/save_location_profile.py). Requires GRAPHQL_ENDPOINT when using NewServiceFromEnv.
type Service struct {
	endpoint   string
	httpClient *http.Client
}

// NewService returns a Service. endpoint must be non-empty (e.g. from GRAPHQL_ENDPOINT).
func NewService(endpoint string, httpClient *http.Client) (*Service, error) {
	if endpoint == "" {
		return nil, fmt.Errorf("locationprofile: graphql endpoint is required")
	}
	if httpClient == nil {
		httpClient = http.DefaultClient
	}
	return &Service{endpoint: endpoint, httpClient: httpClient}, nil
}

type gqlRequest struct {
	Query     string         `json:"query"`
	Variables map[string]any `json:"variables"`
}

type gqlError struct {
	Message string `json:"message"`
}

type gqlEnvelope struct {
	Data   json.RawMessage `json:"data"`
	Errors []gqlError      `json:"errors"`
}

type fetchLocationProfileData struct {
	LocationProfile *LocationProfile `json:"locationProfile"`
}

type saveLocationProfileData struct {
	SaveLocationProfile *LocationProfile `json:"saveLocationProfile"`
}

// Fetch returns the cached profile for (locationID, analyticsRunID), or (nil, nil) if none exists.
func (s *Service) Fetch(ctx context.Context, locationID, analyticsRunID int64) (*LocationProfile, error) {
	vars := map[string]any{
		"locationId":     strconv.FormatInt(locationID, 10),
		"analyticsRunId": strconv.FormatInt(analyticsRunID, 10),
	}
	raw, err := s.postGraphQL(ctx, fetchLocationProfileQuery, vars)
	if err != nil {
		return nil, err
	}
	var data fetchLocationProfileData
	if err := json.Unmarshal(raw, &data); err != nil {
		return nil, fmt.Errorf("locationprofile: decode fetch data: %w", err)
	}
	return data.LocationProfile, nil
}

// Save upserts the profile summary for (locationID, analyticsRunID) and returns the persisted row.
func (s *Service) Save(ctx context.Context, locationID, analyticsRunID int64, summary string) (*LocationProfile, error) {
	vars := map[string]any{
		"locationId":     strconv.FormatInt(locationID, 10),
		"analyticsRunId": strconv.FormatInt(analyticsRunID, 10),
		"summary":        summary,
	}
	raw, err := s.postGraphQL(ctx, saveLocationProfileMutation, vars)
	if err != nil {
		return nil, err
	}
	var data saveLocationProfileData
	if err := json.Unmarshal(raw, &data); err != nil {
		return nil, fmt.Errorf("locationprofile: decode save data: %w", err)
	}
	if data.SaveLocationProfile == nil {
		return nil, fmt.Errorf("locationprofile: saveLocationProfile returned null")
	}
	return data.SaveLocationProfile, nil
}

func (s *Service) postGraphQL(ctx context.Context, query string, variables map[string]any) (json.RawMessage, error) {
	body, err := json.Marshal(gqlRequest{Query: query, Variables: variables})
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.endpoint, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	res, err := s.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	payload, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return nil, fmt.Errorf("locationprofile: graphql HTTP %d: %s", res.StatusCode, bytes.TrimSpace(payload))
	}

	var env gqlEnvelope
	if err := json.Unmarshal(payload, &env); err != nil {
		return nil, fmt.Errorf("locationprofile: decode envelope: %w", err)
	}
	if len(env.Errors) > 0 {
		return nil, fmt.Errorf("locationprofile: graphql: %s", env.Errors[0].Message)
	}
	return env.Data, nil
}
