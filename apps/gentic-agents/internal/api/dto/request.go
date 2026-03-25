package dto

import "encoding/json"

// InvokeRequest is the JSON body for POST /invoke from the web app.
type InvokeRequest struct {
	Message           string          `json:"message"`
	ThreadID          string          `json:"thread_id"`
	AnalyticsID       *int64          `json:"analytics_id"`
	LocationID        *int64          `json:"location_id"`
	DateStart         *string         `json:"date_start"`
	DateEnd           *string         `json:"date_end"`
	NationalHolidays  json.RawMessage `json:"national_holidays,omitempty"`
}
