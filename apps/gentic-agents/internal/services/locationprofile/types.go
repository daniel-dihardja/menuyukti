package locationprofile

import "time"

// LocationProfile matches GraphQL LocationProfileType (see apps/graphql/schema/types/location_profile.py).
type LocationProfile struct {
	ID             int64      `json:"id"`
	LocationID     int64      `json:"locationId"`
	AnalyticsRunID int64      `json:"analyticsRunId"`
	Summary        string     `json:"summary"`
	CreatedAt      *time.Time `json:"createdAt"`
	UpdatedAt      *time.Time `json:"updatedAt"`
}
