package save

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strconv"
	"strings"

	"github.com/daniel-dihardja/gentic-agents/internal/agent/flowstate"
	"github.com/daniel-dihardja/gentic-agents/internal/platform/graphql"
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
)

const metadataKeySavedCampaignID = "_saved_campaign_id"

// Step persists campaign + brief + post schedule to GraphQL and emits a planning SSE payload for the UI.
type Step struct {
	GraphQLEndpoint string
}

// Run implements gen.Step.
func (s Step) Run(ctx context.Context, state *gen.State) error {
	if state == nil {
		return nil
	}
	if v, ok := state.GetMetadata(metadataKeySavedCampaignID); ok {
		if id, ok := v.(string); ok && strings.TrimSpace(id) != "" {
			return nil
		}
	}

	if !flowstate.HasValidPersistedCampaignBrief(state) || !flowstate.HasValidPostSchedule(state) {
		return nil
	}

	locationID, analyticsID, err := flowstate.RequiredLocationIDs(state, "save campaign")
	if err != nil {
		state.Output = err.Error()
		return nil
	}

	briefVal, ok := state.GetMetadata(flowstate.KeyCampaignBrief)
	if !ok {
		return nil
	}
	brief, ok := briefVal.(*graphql.CampaignBrief)
	if !ok || brief == nil {
		return nil
	}
	ps, ok := flowstate.PostScheduleFromMetadata(state)
	if !ok || ps == nil {
		return nil
	}

	meta := state.SecureMetadata()
	dateStart := strings.TrimSpace(meta.GetString("date_start"))
	dateEnd := strings.TrimSpace(meta.GetString("date_end"))
	if dateStart == "" || dateEnd == "" {
		state.Output = "Cannot save campaign: date_start and date_end are required. Ensure the chat request includes your campaign date range."
		return nil
	}

	locID, err := strconv.Atoi(locationID)
	if err != nil {
		return fmt.Errorf("save campaign: location id: %w", err)
	}

	n := gen.NotifierFromContext(ctx)
	if n != nil {
		n.Notify("save_campaign", gen.ActivityRunning, "Save campaign to database")
	}

	name := strings.TrimSpace(brief.CampaignTheme)
	if len(name) > 256 {
		name = name[:256]
	}
	if name == "" {
		name = "Campaign"
	}

	var themePtr, tonePtr *string
	if t := strings.TrimSpace(brief.CampaignTheme); t != "" {
		themePtr = &t
	}
	if t := strings.TrimSpace(brief.Tone); t != "" {
		tonePtr = &t
	}
	var startPtr, endPtr *string
	if dateStart != "" {
		startPtr = &dateStart
	}
	if dateEnd != "" {
		endPtr = &dateEnd
	}

	payload, ok := BuildPlanningPayloadWire(state)
	if !ok || payload.CampaignBrief == nil {
		state.Output = "Cannot save campaign: planning snapshot is incomplete (brief or dates missing)."
		if n != nil {
			n.Notify("save_campaign", gen.ActivityDone, "Save failed — incomplete planning state")
		}
		return nil
	}
	postSlotsJSON, err := json.Marshal(payload.CampaignBrief.PostSlots)
	if err != nil {
		return fmt.Errorf("save campaign: marshal post slots: %w", err)
	}

	campaignID, err := graphql.CreateCampaign(ctx, s.GraphQLEndpoint, locID, name, nil, startPtr, endPtr, themePtr, tonePtr)
	if err != nil {
		return fmt.Errorf("save campaign: createCampaign: %w", err)
	}
	slotsStr := string(postSlotsJSON)
	schedulePtr := &slotsStr

	err = graphql.SaveCampaignBrief(
		ctx,
		s.GraphQLEndpoint,
		campaignID,
		locationID,
		analyticsID,
		strings.TrimSpace(brief.CampaignTheme),
		strings.TrimSpace(brief.Tone),
		strings.TrimSpace(brief.TargetAudience),
		strings.TrimSpace(brief.PostingCadence),
		schedulePtr,
	)
	if err != nil {
		return fmt.Errorf("save campaign: saveCampaignBrief: %w", err)
	}

	state.SetMetadata(metadataKeySavedCampaignID, campaignID)
	state.SetMetadata("campaign_id", campaignID)

	if n != nil {
		n.EmitData("planning", payload)
		n.Notify("save_campaign", gen.ActivityDone, "Campaign saved", gen.WithDetail(campaignID))
	}

	// Short chat reply only — brief and post schedule live in the artifact panel.
	state.Output = "Your campaign is ready."
	return nil
}

// planningPayloadWire matches the shape expected by apps/web/app/api/chat/route.ts (AgentSSEChunk.planning).
type planningPayloadWire struct {
	DateStart          string                 `json:"dateStart"`
	DateEnd            string                 `json:"dateEnd"`
	NationalHolidays   []nationalHolidayWire  `json:"nationalHolidays,omitempty"`
	LocationSummary    *string                `json:"locationSummary,omitempty"`
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
	sort.Strings(dates)

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
		cap := fmt.Sprintf("%s post — highlight your best dishes and offers.", theme)

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

// BuildPlanningPayloadWire constructs the planning payload wire from the current state.
func BuildPlanningPayloadWire(state *gen.State) (*planningPayloadWire, bool) {
	meta := state.SecureMetadata()
	dateStart := strings.TrimSpace(meta.GetString("date_start"))
	dateEnd := strings.TrimSpace(meta.GetString("date_end"))
	if dateStart == "" || dateEnd == "" {
		return nil, false
	}

	brief, ok := state.GetMetadata(flowstate.KeyCampaignBrief)
	if !ok {
		return nil, false
	}
	b, ok := brief.(*graphql.CampaignBrief)
	if !ok || b == nil {
		return nil, false
	}

	ps, ok := flowstate.PostScheduleFromMetadata(state)
	if !ok || ps == nil {
		return nil, false
	}

	plan, _ := flowstate.PostFormatPlanFromMetadata(state)

	payload := &planningPayloadWire{
		DateStart:        dateStart,
		DateEnd:          dateEnd,
		NationalHolidays: parseNationalHolidaysWire(meta.GetString("national_holidays")),
	}

	locProfile, ok := flowstate.LocationProfileFromMetadata(state)
	if ok && locProfile != nil {
		summary := strings.TrimSpace(locProfile.Summary)
		if summary != "" {
			payload.LocationSummary = &summary
		}
	}

	payload.CampaignBrief = &campaignBriefWire{
		CampaignTheme:  strings.TrimSpace(b.CampaignTheme),
		Tone:           strings.TrimSpace(b.Tone),
		TargetAudience: strings.TrimSpace(b.TargetAudience),
		PostingCadence: strings.TrimSpace(b.PostingCadence),
		PostSlots:      buildPostSlotsWire(ps, meta.GetString("national_holidays"), plan),
	}

	return payload, true
}
