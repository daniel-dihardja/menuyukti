package step

import gen "github.com/daniel-dihardja/gentic/pkg/gentic"

const metadataKeyPostFormatPlan = "_post_format_plan"

// PostFormatAssignment mirrors Python FormatAssignment / ig_campaign post format plan rows.
type PostFormatAssignment struct {
	ScheduledDate      string   `json:"scheduled_date"`
	Format             string   `json:"format"` // "single" | "carousel"
	Items              []string `json:"items"`
	CarouselNarrative  *string  `json:"carousel_narrative,omitempty"`
}

// PostFormatPlan is the LLM output for assigning formats to promotion dates.
type PostFormatPlan struct {
	Assignments []PostFormatAssignment `json:"assignments"`
}

func hasPostFormatPlan(state *gen.State) bool {
	p, ok := postFormatPlanFromMetadata(state)
	return ok && p != nil && len(p.Assignments) > 0
}

func postFormatPlanFromMetadata(state *gen.State) (*PostFormatPlan, bool) {
	if state == nil {
		return nil, false
	}
	v, ok := state.GetMetadata(metadataKeyPostFormatPlan)
	if !ok {
		return nil, false
	}
	p, ok := v.(*PostFormatPlan)
	if !ok || p == nil {
		return nil, false
	}
	return p, true
}
