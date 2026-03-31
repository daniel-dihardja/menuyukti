package flowstate

import (
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
)

// PostFormatAssignment mirrors Python FormatAssignment / ig_campaign post format plan rows.
type PostFormatAssignment struct {
	ScheduledDate     string   `json:"scheduled_date"`
	Format            string   `json:"format"` // "single" | "carousel"
	Items             []string `json:"items"`
	CarouselNarrative *string  `json:"carousel_narrative,omitempty"`
}

// PostFormatPlan is the LLM output for assigning formats to promotion dates.
type PostFormatPlan struct {
	Assignments []PostFormatAssignment `json:"assignments"`
}

// PostFormatPlanFromMetadata retrieves the post format plan from state.
func PostFormatPlanFromMetadata(state *gen.State) (*PostFormatPlan, bool) {
	if state == nil {
		return nil, false
	}
	v, ok := state.GetMetadata(KeyPostFormatPlan)
	if !ok {
		return nil, false
	}
	p, ok := v.(*PostFormatPlan)
	if !ok || p == nil {
		return nil, false
	}
	return p, true
}

// HasPostFormatPlan checks if a post format plan with at least one assignment exists.
func HasPostFormatPlan(state *gen.State) bool {
	p, ok := PostFormatPlanFromMetadata(state)
	return ok && p != nil && len(p.Assignments) > 0
}
