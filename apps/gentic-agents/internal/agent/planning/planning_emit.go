package planning

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/daniel-dihardja/gentic-agents/internal/agent/flowstate"
	"github.com/daniel-dihardja/gentic-agents/internal/platform/graphql"
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
)

// NotifyRefiningIteration returns an OnIteration callback for reflect.RunReflectLoop / RunTypedReflectLoop.
// stepID must match the final ActivityDone step name so the same row updates from reflecting to done.
func NotifyRefiningIteration(stepID string) func(ctx context.Context, current, total int) {
	return func(ctx context.Context, current, total int) {
		n := gen.NotifierFromContext(ctx)
		if n != nil {
			n.Notify(stepID, gen.ActivityReflecting,
				fmt.Sprintf("Refining (%d/%d)", current, total))
		}
	}
}

// EmitPlanningProgress sends a data-planning SSE payload so the web artifact updates before save completes.
func EmitPlanningProgress(ctx context.Context, state *gen.State) {
	n := gen.NotifierFromContext(ctx)
	if n == nil {
		return
	}
	p, ok := buildPlanningPayloadWire(state)
	if !ok {
		return
	}
	n.EmitData("planning", p)
}

// planningPayloadWire matches the shape expected by apps/web/app/api/chat/route.ts (AgentSSEChunk.planning).
type planningPayloadWire struct {
	DateStart          string                 `json:"dateStart"`
	DateEnd            string                 `json:"dateEnd"`
	NationalHolidays   []nationalHolidayWire  `json:"nationalHolidays,omitempty"`
	LocationSummary    *string                `json:"locationSummary,omitempty"`
	LocationProfileId  *string                `json:"locationProfileId,omitempty"`
	CampaignBrief      *campaignBriefWire     `json:"campaignBrief,omitempty"`
}

type campaignBriefWire struct {
	CampaignTheme   string            `json:"campaign_theme"`
	Tone            string            `json:"tone"`
	TargetAudience  string            `json:"target_audience"`
	PostingCadence  string            `json:"posting_cadence"`
	PostSlots       []PostSlotWire    `json:"post_slots"`
}

type PostSlotWire struct {
	ScheduledDate      string   `json:"scheduled_date"`
	ScheduledTime      *string  `json:"scheduled_time,omitempty"`
	Theme              string   `json:"theme"`
	Format             string   `json:"format"`
	FocusItem          *string  `json:"focus_item"`
	CarouselItems      []string `json:"carousel_items,omitempty"`
	CarouselNarrative  *string  `json:"carousel_narrative,omitempty"`
	CaptionSeed        string   `json:"caption_seed"`
}

type nationalHolidayWire struct {
	ID        string `json:"id"`
	LocalName string `json:"localName"`
	Name      string `json:"name"`
	Date      string `json:"date"`
	Type      string `json:"type,omitempty"`
}

// buildPlanningPayloadWire builds the planning snapshot for the UI (and final save emission).
// Returns false if date_start/date_end are missing from metadata (request did not include a range).
func buildPlanningPayloadWire(state *gen.State) (planningPayloadWire, bool) {
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
	var locProfileId *string
	if p, ok := flowstate.LocationProfileFromMetadata(state); ok && p != nil && strings.TrimSpace(p.Summary) != "" {
		s := strings.TrimSpace(p.Summary)
		locSummary = &s
		if p.ID != "" {
			idStr := string(p.ID)
			locProfileId = &idStr
		}
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
			var formatPlan *flowstate.PostFormatPlan
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
		DateStart:         dateStart,
		DateEnd:           dateEnd,
		NationalHolidays:  holidaysWire,
		LocationSummary:   locSummary,
		LocationProfileId: locProfileId,
		CampaignBrief:     briefPtr,
	}, true
}

func parseNationalHolidaysWire(raw string) []nationalHolidayWire {
	raw = strings.TrimSpace(raw)
	if raw == "" || raw == "null" {
		return nil
	}
	var out []nationalHolidayWire
	if err := json.Unmarshal([]byte(raw), &out); err != nil {
		return nil
	}
	return out
}

func buildPostSlotsWire(ps *flowstate.PostSchedule, nationalHolidaysJSON string, plan *flowstate.PostFormatPlan) []PostSlotWire {
	holidayDates := map[string]struct{}{}
	raw := strings.TrimSpace(nationalHolidaysJSON)
	if raw != "" && raw != "null" {
		var holidays []struct {
			Date string `json:"date"`
		}
		if err := json.Unmarshal([]byte(raw), &holidays); err == nil {
			for _, h := range holidays {
				if h.Date != "" {
					holidayDates[h.Date] = struct{}{}
				}
			}
		}
	}

	byDate := map[string]flowstate.PostFormatAssignment{}
	if plan != nil {
		for _, a := range plan.Assignments {
			byDate[strings.TrimSpace(a.ScheduledDate)] = a
		}
	}

	var dates []string
	seen := map[string]struct{}{}
	for _, w := range ps.Weeks {
		for _, d := range w.SelectedDates {
			if _, ok := seen[d]; ok {
				continue
			}
			seen[d] = struct{}{}
			dates = append(dates, d)
		}
	}

	out := make([]PostSlotWire, 0, len(dates))
	for _, d := range dates {
		a, ok := byDate[d]
		if !ok {
			continue
		}

		theme := "promotion"
		if _, ok := holidayDates[d]; ok {
			theme = "holiday"
		}
		cap := "promotion post — highlight your best dishes and offers."
		if _, ok := holidayDates[d]; ok {
			cap = "holiday post — highlight your best dishes and offers."
		}

		slot := PostSlotWire{
			ScheduledDate: d,
			Theme:         theme,
			Format:        "single",
			FocusItem:     nil,
			CaptionSeed:   cap,
		}

		if normalizePostFormat(a.Format) == "carousel" {
			slot.Format = "carousel"
			slot.CarouselItems = append([]string(nil), a.Items...)
			slot.CarouselNarrative = a.CarouselNarrative
			slot.FocusItem = nil
			if a.CarouselNarrative != nil && strings.TrimSpace(*a.CarouselNarrative) != "" {
				slot.CaptionSeed = strings.TrimSpace(*a.CarouselNarrative)
			}
		} else {
			slot.Format = "single"
			if len(a.Items) > 0 {
				f := strings.TrimSpace(a.Items[0])
				if f != "" {
					slot.FocusItem = &f
				}
			}
			slot.CarouselItems = nil
			slot.CarouselNarrative = nil
		}

		out = append(out, slot)
	}
	return out
}

func normalizePostFormat(s string) string {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "carousel":
		return "carousel"
	default:
		return "single"
	}
}
