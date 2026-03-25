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

const fetchLocationDataQuery = `query FetchLocationData($locationId: ID!, $analyticsRunId: ID!) {
  location(id: $locationId) {
    id
    name
    street
    city
    country
  }
  operatingProfile(locationId: $locationId, analyticsRunId: $analyticsRunId) {
    totalOrders
    totalRevenue
    activeDaysCount
    avgDailyOrders
    avgOrderSize
    weekdayShare
    weekendShare
    peakDay
    primaryMealPeriod
    activeMealPeriods
    operatingPattern
    diningFocus
    mealPeriodBreakdown {
      period
      label
      orderCount
      share
      revenue
      revenueShare
    }
    dayOfWeekBreakdown {
      day
      isWeekend
      orderCount
      share
      revenue
      isPeakDay
    }
    dayTypeBreakdown {
      type
      orderCount
      share
      revenue
      revenueShare
    }
  }
}`

const saveLocationProfileMutation = `mutation SaveLocationProfile($locationId: ID!, $analyticsRunId: ID!, $summary: String!) {
  saveLocationProfile(locationId: $locationId, analyticsRunId: $analyticsRunId, summary: $summary) {
    id
  }
}`

// LocationProfile is the subset of fields returned by locationProfile.
type LocationProfile struct {
	ID      ID     `json:"id"`
	Summary string `json:"summary"`
}

// Location is basic venue info from the GraphQL API.
type Location struct {
	ID      ID     `json:"id"`
	Name    string `json:"name"`
	Street  string `json:"street"`
	City    string `json:"city"`
	Country string `json:"country"`
}

// MealPeriodBreakdownRow matches operatingProfile.mealPeriodBreakdown items.
type MealPeriodBreakdownRow struct {
	Period        string  `json:"period"`
	Label         string  `json:"label"`
	OrderCount    int     `json:"orderCount"`
	Share         float64 `json:"share"`
	Revenue       float64 `json:"revenue"`
	RevenueShare  float64 `json:"revenueShare"`
}

// DayOfWeekBreakdownRow matches operatingProfile.dayOfWeekBreakdown items.
type DayOfWeekBreakdownRow struct {
	Day        string  `json:"day"`
	IsWeekend  bool    `json:"isWeekend"`
	OrderCount int     `json:"orderCount"`
	Share      float64 `json:"share"`
	Revenue    float64 `json:"revenue"`
	IsPeakDay  bool    `json:"isPeakDay"`
}

// DayTypeBreakdownRow matches operatingProfile.dayTypeBreakdown items.
type DayTypeBreakdownRow struct {
	Type           string  `json:"type"`
	OrderCount     int     `json:"orderCount"`
	Share          float64 `json:"share"`
	Revenue        float64 `json:"revenue"`
	RevenueShare   float64 `json:"revenueShare"`
}

// OperatingProfile holds analytics fields used for the location summary prompt.
type OperatingProfile struct {
	TotalOrders         int                      `json:"totalOrders"`
	TotalRevenue        float64                  `json:"totalRevenue"`
	ActiveDaysCount     int                      `json:"activeDaysCount"`
	AvgDailyOrders      float64                  `json:"avgDailyOrders"`
	AvgOrderSize        float64                  `json:"avgOrderSize"`
	WeekdayShare        float64                  `json:"weekdayShare"`
	WeekendShare        float64                  `json:"weekendShare"`
	PeakDay             string                   `json:"peakDay"`
	PrimaryMealPeriod   string                   `json:"primaryMealPeriod"`
	ActiveMealPeriods   []string                 `json:"activeMealPeriods"`
	OperatingPattern    string                   `json:"operatingPattern"`
	DiningFocus         string                   `json:"diningFocus"`
	MealPeriodBreakdown []MealPeriodBreakdownRow `json:"mealPeriodBreakdown"`
	DayOfWeekBreakdown  []DayOfWeekBreakdownRow  `json:"dayOfWeekBreakdown"`
	DayTypeBreakdown    []DayTypeBreakdownRow    `json:"dayTypeBreakdown"`
}

type gqlRequest struct {
	Query     string                 `json:"query"`
	Variables map[string]interface{} `json:"variables"`
}

type gqlError struct {
	Message string `json:"message"`
}

type gqlResponse struct {
	Data   json.RawMessage `json:"data"`
	Errors []gqlError      `json:"errors"`
}

type profileDataWrapper struct {
	LocationProfile *LocationProfile `json:"locationProfile"`
}

type locationDataWrapper struct {
	Location          *Location           `json:"location"`
	OperatingProfile  *OperatingProfile   `json:"operatingProfile"`
}

type saveLocationProfileDataWrapper struct {
	SaveLocationProfile *struct {
		ID ID `json:"id"`
	} `json:"saveLocationProfile"`
}

// FetchLocationProfile calls locationProfile(locationId, analyticsRunId).
// Returns nil, nil when the server returns null (profile not yet created).
func FetchLocationProfile(ctx context.Context, endpoint, locationID, analyticsRunID string) (*LocationProfile, error) {
	raw, err := postGQL(ctx, endpoint, fetchLocationProfileQuery, map[string]interface{}{
		"locationId":       locationID,
		"analyticsRunId": analyticsRunID,
	})
	if err != nil {
		return nil, err
	}
	var data profileDataWrapper
	if err := json.Unmarshal(raw, &data); err != nil {
		return nil, err
	}
	return data.LocationProfile, nil
}

// FetchLocationData loads location and operating profile for profile generation.
// operatingProfile may be nil when the analytics run is invalid or has no data.
func FetchLocationData(ctx context.Context, endpoint, locationID, analyticsRunID string) (*Location, *OperatingProfile, error) {
	raw, err := postGQL(ctx, endpoint, fetchLocationDataQuery, map[string]interface{}{
		"locationId":       locationID,
		"analyticsRunId": analyticsRunID,
	})
	if err != nil {
		return nil, nil, err
	}
	var data locationDataWrapper
	if err := json.Unmarshal(raw, &data); err != nil {
		return nil, nil, err
	}
	return data.Location, data.OperatingProfile, nil
}

// SaveLocationProfile persists (upserts) a location profile summary.
func SaveLocationProfile(ctx context.Context, endpoint, locationID, analyticsRunID, summary string) error {
	raw, err := postGQL(ctx, endpoint, saveLocationProfileMutation, map[string]interface{}{
		"locationId":       locationID,
		"analyticsRunId":   analyticsRunID,
		"summary":          summary,
	})
	if err != nil {
		return err
	}
	var data saveLocationProfileDataWrapper
	if err := json.Unmarshal(raw, &data); err != nil {
		return err
	}
	if data.SaveLocationProfile == nil {
		return fmt.Errorf("graphql: saveLocationProfile returned no data")
	}
	return nil
}

func postGQL(ctx context.Context, endpoint, query string, variables map[string]interface{}) (json.RawMessage, error) {
	body, err := json.Marshal(gqlRequest{
		Query:     query,
		Variables: variables,
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
	if len(out.Data) == 0 {
		return nil, fmt.Errorf("graphql: empty data")
	}
	return out.Data, nil
}
