package step

import (
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
)

const metadataKeyPostSchedule = "_post_schedule"

// WeekSelection is the LLM's date selection for a single campaign week.
type WeekSelection struct {
	WeekNumber    int      `json:"week_number"`
	SelectedDates []string `json:"selected_dates"`
}

// PostSchedule is the full post schedule across all campaign weeks.
type PostSchedule struct {
	Weeks []WeekSelection `json:"weeks"`
}

func hasValidPostSchedule(state *gen.State) bool {
	if state == nil || state.Metadata == nil {
		return false
	}
	v, ok := state.Metadata[metadataKeyPostSchedule]
	if !ok {
		return false
	}
	ps, ok := v.(*PostSchedule)
	if !ok || ps == nil {
		return false
	}
	if len(ps.Weeks) == 0 {
		return false
	}
	for _, w := range ps.Weeks {
		if len(w.SelectedDates) > 0 {
			return true
		}
	}
	return false
}

func postScheduleFromMetadata(state *gen.State) (*PostSchedule, bool) {
	if state == nil || state.Metadata == nil {
		return nil, false
	}
	v, ok := state.Metadata[metadataKeyPostSchedule]
	if !ok {
		return nil, false
	}
	ps, ok := v.(*PostSchedule)
	if !ok || ps == nil {
		return nil, false
	}
	return ps, true
}
