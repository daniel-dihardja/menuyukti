package graphql

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"
)

const fetchLocationProfileQuery = `query FetchLocationProfile($locationId: ID!, $analyticsRunId: ID!) {
  locationProfile(locationId: $locationId, analyticsRunId: $analyticsRunId) {
    id
    summary
  }
}`

const fetchMenuEngineeringMatrixQuery = `query FetchMenuEngineeringMatrix($analyticsRunId: ID!, $categories: [String!]) {
  menuEngineeringMatrix(analyticsRunId: $analyticsRunId, categories: $categories) {
    items {
      menu
      category
      action
      quantity
      totalRevenue
      cogs
      totalCogs
      contributionMargin
      contributionMarginPercentage
      marginPerUnit
      weValue
      menuCategory
      menuCategoryDetail
    }
  }
}`

const fetchMenuHeatmapsQuery = `query FetchMenuHeatmaps($analyticsRunId: ID!, $locationId: ID) {
  menuHeatmaps(analyticsRunId: $analyticsRunId, locationId: $locationId) {
    menu
    menuCategory
    menuCategoryDetail
    reportingPeriod
    dailyHeatmap {
      hour
      quantity
    }
    weeklyHeatmap {
      day
      quantity
    }
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

const fetchCampaignBriefQuery = `query FetchCampaignBrief($campaignId: ID!) {
  campaignBrief(campaignId: $campaignId) {
    id
    campaignId
    locationId
    analyticsRunId
    campaignTheme
    tone
    targetAudience
    postingCadence
  }
}`

const createCampaignMutation = `mutation CreateCampaign($locationId: Int!, $name: String!, $goal: String, $startDate: Date, $endDate: Date, $theme: String, $tone: String) {
  createCampaign(locationId: $locationId, name: $name, goal: $goal, startDate: $startDate, endDate: $endDate, theme: $theme, tone: $tone) {
    id
    name
  }
}`

const saveCampaignBriefMutation = `mutation SaveCampaignBrief($campaignId: ID!, $locationId: ID!, $analyticsRunId: ID!, $campaignTheme: String!, $tone: String!, $targetAudience: String!, $postingCadence: String!, $postScheduleJson: String) {
  saveCampaignBrief(campaignId: $campaignId, locationId: $locationId, analyticsRunId: $analyticsRunId, campaignTheme: $campaignTheme, tone: $tone, targetAudience: $targetAudience, postingCadence: $postingCadence, postScheduleJson: $postScheduleJson) {
    id
  }
}`

// LocationProfile is the subset of fields returned by locationProfile.
type LocationProfile struct {
	ID      ID     `json:"id"`
	Summary string `json:"summary"`
}

// CampaignBrief is the subset of fields returned by campaignBrief.
type CampaignBrief struct {
	ID             ID     `json:"id"`
	CampaignID     ID     `json:"campaignId"`
	LocationID     ID     `json:"locationId"`
	AnalyticsRunID ID     `json:"analyticsRunId"`
	CampaignTheme  string `json:"campaignTheme"`
	Tone           string `json:"tone"`
	TargetAudience string `json:"targetAudience"`
	PostingCadence string `json:"postingCadence"`
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
	Period       string  `json:"period"`
	Label        string  `json:"label"`
	OrderCount   int     `json:"orderCount"`
	Share        float64 `json:"share"`
	Revenue      float64 `json:"revenue"`
	RevenueShare float64 `json:"revenueShare"`
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
	Type         string  `json:"type"`
	OrderCount   int     `json:"orderCount"`
	Share        float64 `json:"share"`
	Revenue      float64 `json:"revenue"`
	RevenueShare float64 `json:"revenueShare"`
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
	Location         *Location         `json:"location"`
	OperatingProfile *OperatingProfile `json:"operatingProfile"`
}

type menuEngineeringMatrixDataWrapper struct {
	MenuEngineeringMatrix *menuEngineeringMatrixPayload `json:"menuEngineeringMatrix"`
}

type menuEngineeringMatrixPayload struct {
	Items []MenuEngineeringItem `json:"items"`
}

// MenuEngineeringItem is one row from menuEngineeringMatrix.items (BCG classification).
type MenuEngineeringItem struct {
	Menu                         string  `json:"menu"`
	Category                     string  `json:"category"`
	Action                       string  `json:"action"`
	Quantity                     int     `json:"quantity"`
	TotalRevenue                 float64 `json:"totalRevenue"`
	Cogs                         float64 `json:"cogs"`
	TotalCogs                    float64 `json:"totalCogs"`
	ContributionMargin           float64 `json:"contributionMargin"`
	ContributionMarginPercentage float64 `json:"contributionMarginPercentage"`
	MarginPerUnit                float64 `json:"marginPerUnit"`
	WeValue                      float64 `json:"weValue"`
	MenuCategory                 *string `json:"menuCategory"`
	MenuCategoryDetail           *string `json:"menuCategoryDetail"`
}

type menuHeatmapsDataWrapper struct {
	MenuHeatmaps []MenuHeatmap `json:"menuHeatmaps"`
}

// DailyHeatmapPoint is one hour bucket from menuHeatmaps.dailyHeatmap.
type DailyHeatmapPoint struct {
	Hour     int `json:"hour"`
	Quantity int `json:"quantity"`
}

// WeeklyHeatmapPoint is one weekday bucket from menuHeatmaps.weeklyHeatmap.
type WeeklyHeatmapPoint struct {
	Day      string `json:"day"`
	Quantity int    `json:"quantity"`
}

// MenuHeatmap is demand heatmaps for one menu item from menuHeatmaps.
type MenuHeatmap struct {
	Menu               string               `json:"menu"`
	MenuCategory       *string              `json:"menuCategory"`
	MenuCategoryDetail *string              `json:"menuCategoryDetail"`
	ReportingPeriod    string               `json:"reportingPeriod"`
	DailyHeatmap       []DailyHeatmapPoint  `json:"dailyHeatmap"`
	WeeklyHeatmap      []WeeklyHeatmapPoint `json:"weeklyHeatmap"`
}

type saveLocationProfileDataWrapper struct {
	SaveLocationProfile *struct {
		ID ID `json:"id"`
	} `json:"saveLocationProfile"`
}

type campaignBriefDataWrapper struct {
	CampaignBrief *CampaignBrief `json:"campaignBrief"`
}

type saveCampaignBriefDataWrapper struct {
	SaveCampaignBrief *struct {
		ID ID `json:"id"`
	} `json:"saveCampaignBrief"`
}

type createCampaignDataWrapper struct {
	CreateCampaign *struct {
		ID ID `json:"id"`
	} `json:"createCampaign"`
}

// FetchLocationProfile calls locationProfile(locationId, analyticsRunId).
// Returns nil, nil when the server returns null (profile not yet created).
func FetchLocationProfile(ctx context.Context, endpoint, locationID, analyticsRunID string) (*LocationProfile, error) {
	raw, err := postGQL(ctx, endpoint, fetchLocationProfileQuery, map[string]interface{}{
		"locationId":     locationID,
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

// FetchMenuEngineeringMatrix loads filtered BCG matrix items for promotion planning.
// Returns nil, nil when the server returns null (e.g. no COGS / matrix unavailable).
func FetchMenuEngineeringMatrix(ctx context.Context, endpoint, analyticsRunID string, categories []string) ([]MenuEngineeringItem, error) {
	raw, err := postGQL(ctx, endpoint, fetchMenuEngineeringMatrixQuery, map[string]interface{}{
		"analyticsRunId": analyticsRunID,
		"categories":     categories,
	})
	if err != nil {
		return nil, err
	}
	var data menuEngineeringMatrixDataWrapper
	if err := json.Unmarshal(raw, &data); err != nil {
		return nil, err
	}
	if data.MenuEngineeringMatrix == nil {
		return nil, nil
	}
	return data.MenuEngineeringMatrix.Items, nil
}

// FetchMenuHeatmaps loads hourly and day-of-week heatmaps for every menu item in an analytics run.
// When locationID is non-empty, the run must belong to that location (otherwise the server returns an empty list).
func FetchMenuHeatmaps(ctx context.Context, endpoint, analyticsRunID, locationID string) ([]MenuHeatmap, error) {
	vars := map[string]interface{}{
		"analyticsRunId": analyticsRunID,
		"locationId":     nil,
	}
	if strings.TrimSpace(locationID) != "" {
		vars["locationId"] = locationID
	}
	raw, err := postGQL(ctx, endpoint, fetchMenuHeatmapsQuery, vars)
	if err != nil {
		return nil, err
	}
	var data menuHeatmapsDataWrapper
	if err := json.Unmarshal(raw, &data); err != nil {
		return nil, err
	}
	if data.MenuHeatmaps == nil {
		return []MenuHeatmap{}, nil
	}
	return data.MenuHeatmaps, nil
}

// FetchLocationData loads location and operating profile for profile generation.
// operatingProfile may be nil when the analytics run is invalid or has no data.
func FetchLocationData(ctx context.Context, endpoint, locationID, analyticsRunID string) (*Location, *OperatingProfile, error) {
	raw, err := postGQL(ctx, endpoint, fetchLocationDataQuery, map[string]interface{}{
		"locationId":     locationID,
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

// SaveLocationProfile persists (upserts) a location profile summary and returns the saved row id.
func SaveLocationProfile(ctx context.Context, endpoint, locationID, analyticsRunID, summary string) (string, error) {
	raw, err := postGQL(ctx, endpoint, saveLocationProfileMutation, map[string]interface{}{
		"locationId":     locationID,
		"analyticsRunId": analyticsRunID,
		"summary":        summary,
	})
	if err != nil {
		return "", err
	}
	var data saveLocationProfileDataWrapper
	if err := json.Unmarshal(raw, &data); err != nil {
		return "", err
	}
	if data.SaveLocationProfile == nil {
		return "", fmt.Errorf("graphql: saveLocationProfile returned no data")
	}
	return string(data.SaveLocationProfile.ID), nil
}

// FetchCampaignBrief calls campaignBrief(campaignId). Returns nil, nil when not found.
func FetchCampaignBrief(ctx context.Context, endpoint, campaignID string) (*CampaignBrief, error) {
	raw, err := postGQL(ctx, endpoint, fetchCampaignBriefQuery, map[string]interface{}{
		"campaignId": campaignID,
	})
	if err != nil {
		return nil, err
	}
	var data campaignBriefDataWrapper
	if err := json.Unmarshal(raw, &data); err != nil {
		return nil, err
	}
	return data.CampaignBrief, nil
}

// CreateCampaign inserts a campaign row and returns the new campaign id as a string.
func CreateCampaign(ctx context.Context, endpoint string, locationID int, name string, goal *string, startDate, endDate *string, theme, tone *string) (string, error) {
	vars := map[string]interface{}{
		"locationId": locationID,
		"name":       name,
	}
	if goal != nil {
		vars["goal"] = *goal
	}
	if startDate != nil {
		vars["startDate"] = *startDate
	}
	if endDate != nil {
		vars["endDate"] = *endDate
	}
	if theme != nil {
		vars["theme"] = *theme
	}
	if tone != nil {
		vars["tone"] = *tone
	}
	raw, err := postGQL(ctx, endpoint, createCampaignMutation, vars)
	if err != nil {
		return "", err
	}
	var data createCampaignDataWrapper
	if err := json.Unmarshal(raw, &data); err != nil {
		return "", err
	}
	if data.CreateCampaign == nil {
		return "", fmt.Errorf("graphql: createCampaign returned no data")
	}
	return string(data.CreateCampaign.ID), nil
}

// SaveCampaignBrief upserts a campaign brief for the given campaign.
// postScheduleJSON is optional JSON text (e.g. serialized post_slots array).
func SaveCampaignBrief(ctx context.Context, endpoint, campaignID, locationID, analyticsRunID, campaignTheme, tone, targetAudience, postingCadence string, postScheduleJSON *string) error {
	vars := map[string]interface{}{
		"campaignId":     campaignID,
		"locationId":     locationID,
		"analyticsRunId": analyticsRunID,
		"campaignTheme":  campaignTheme,
		"tone":           tone,
		"targetAudience": targetAudience,
		"postingCadence": postingCadence,
	}
	if postScheduleJSON != nil {
		vars["postScheduleJson"] = *postScheduleJSON
	} else {
		vars["postScheduleJson"] = nil
	}
	raw, err := postGQL(ctx, endpoint, saveCampaignBriefMutation, vars)
	if err != nil {
		return err
	}
	var data saveCampaignBriefDataWrapper
	if err := json.Unmarshal(raw, &data); err != nil {
		return err
	}
	if data.SaveCampaignBrief == nil {
		return fmt.Errorf("graphql: saveCampaignBrief returned no data")
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
	if uid := UserIDFromContext(ctx); uid != "" {
		req.Header.Set("X-User-Id", uid)
	}
	if key := os.Getenv("GRAPHQL_INTERNAL_API_KEY"); key != "" {
		req.Header.Set("X-Internal-Api-Key", key)
	}

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
