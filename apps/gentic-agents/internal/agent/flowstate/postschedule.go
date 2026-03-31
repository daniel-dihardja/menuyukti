package flowstate

import (
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
)

// WeekSelection is the LLM's date selection for a single campaign week.
type WeekSelection struct {
	WeekNumber    int      `json:"week_number"`
	SelectedDates []string `json:"selected_dates"`
}

// PostSchedule is the full post schedule across all campaign weeks.
type PostSchedule struct {
	Weeks []WeekSelection `json:"weeks"`
}

// PostScheduleFromMetadata retrieves the post schedule from state.
func PostScheduleFromMetadata(state *gen.State) (*PostSchedule, bool) {
	if state == nil {
		return nil, false
	}
	v, ok := state.GetMetadata(KeyPostSchedule)
	if !ok {
		return nil, false
	}
	ps, ok := v.(*PostSchedule)
	if !ok || ps == nil {
		return nil, false
	}
	return ps, true
}

// HasValidPostSchedule checks if a post schedule with at least one selected date exists.
func HasValidPostSchedule(state *gen.State) bool {
	if state == nil {
		return false
	}
	v, ok := state.GetMetadata(KeyPostSchedule)
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
