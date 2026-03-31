package step

import (
	"context"
	"strings"

	"github.com/daniel-dihardja/gentic-agents/internal/platform/graphql"
	"github.com/daniel-dihardja/gentic-agents/internal/agent/flowstate"
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
)

// EmitPlanningProgress sends a data-planning SSE payload so the web artifact updates before save completes.
func EmitPlanningProgress(ctx context.Context, state *gen.State) {
	n := gen.NotifierFromContext(ctx)
	if n == nil {
		return
	}
	p, ok := BuildPlanningPayloadWire(state)
	if !ok {
		return
	}
	n.EmitData("planning", p)
}

// BuildPlanningPayloadWire builds the planning snapshot for the UI (and final save emission).
// Returns false if date_start/date_end are missing from metadata (request did not include a range).
func BuildPlanningPayloadWire(state *gen.State) (planningPayloadWire, bool) {
	if state == nil {
		return planningPayloadWire{}, false
	}
	meta := state.SecureMetadata()
	dateStart := strings.TrimSpace(meta.GetString("date_start"))
	dateEnd := strings.TrimSpace(meta.GetString("date_end"))
	if dateStart == "" || dateEnd == "" {
		return planningPayloadWire{}, false
	}

	holidaysWire := parseNationalHolidaysWire(meta.GetString("national_holidays"))
	var locSummary *string
	if p, ok := flowstate.LocationProfileFromMetadata(state); ok && p != nil && strings.TrimSpace(p.Summary) != "" {
		s := strings.TrimSpace(p.Summary)
		locSummary = &s
	}

	var briefPtr *campaignBriefWire
	if briefVal, ok := state.GetMetadata(flowstate.KeyCampaignBrief); ok {
		if brief, ok := briefVal.(*graphql.CampaignBrief); ok && brief != nil {
			cw := &campaignBriefWire{
				CampaignTheme:  strings.TrimSpace(brief.CampaignTheme),
				Tone:           strings.TrimSpace(brief.Tone),
				TargetAudience: strings.TrimSpace(brief.TargetAudience),
				PostingCadence: strings.TrimSpace(brief.PostingCadence),
				PostSlots:      []PostSlotWire{},
			}
			ps, psOk := flowstate.PostScheduleFromMetadata(state)
			var formatPlan *PostFormatPlan
			if fp, ok := flowstate.PostFormatPlanFromMetadata(state); ok {
				formatPlan = fp
			}
			if psOk && ps != nil {
				cw.PostSlots = buildPostSlotsWire(ps, meta.GetString("national_holidays"), formatPlan)
			}
			briefPtr = cw
		}
	}

	return planningPayloadWire{
		DateStart:        dateStart,
		DateEnd:          dateEnd,
		NationalHolidays: holidaysWire,
		LocationSummary:  locSummary,
		CampaignBrief:    briefPtr,
	}, true
}
