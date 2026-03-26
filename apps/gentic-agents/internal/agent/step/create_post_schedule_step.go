package step

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sort"
	"strings"
	"time"

	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
	"github.com/daniel-dihardja/gentic/pkg/gentic/reflect"
	"github.com/daniel-dihardja/gentic/pkg/providers/openai"
)

const (
	minPostsFullWeek = 3
	maxPostsPerWeek  = 5
	minDaysFullWeek  = 5

	scheduleGenerationSystem = "You are scheduling Instagram posts for a restaurant. Follow the instructions precisely. Reply with valid JSON only, no markdown."
	scheduleReflectionSystem = "You are a quality reviewer for restaurant Instagram posting schedules."
	scheduleNotifySystem     = "You are a helpful assistant for restaurant marketing. Write concise, friendly user-facing confirmations."
)

// nationalHoliday matches client JSON for national_holidays metadata.
type nationalHoliday struct {
	ID   string `json:"id"`
	Date string `json:"date"`
	Name string `json:"name"`
}

type candidateSlot struct {
	Date       string
	DayName    string
	WeekNumber int
	HolidayID  string
	Proximity  string
	IsPinned   bool
}

type candidateWeek struct {
	WeekNumber int
	WeekLabel  string
	IsPartial  bool
	Slots      []candidateSlot
}

// CreatePostScheduleStep selects posting dates from a candidate calendar (with reflection) and stores the result in metadata only.
type CreatePostScheduleStep struct {
	Model                   string
	MaxReflectionIterations int
}

// Run implements gentic.Step.
func (s CreatePostScheduleStep) Run(ctx context.Context, state *gen.State) error {
	if hasValidPostSchedule(state) {
		return nil
	}

	_, _, ok := requiredLocationIDs(state, "create post schedule")
	if !ok {
		return nil
	}

	profile, ok := locationProfileFromMetadata(state)
	if !ok || strings.TrimSpace(profile.Summary) == "" {
		state.Output = "Cannot create post schedule: location profile is missing. Complete the location profile step first."
		return nil
	}

	meta := state.SecureMetadata()
	dateStart := strings.TrimSpace(meta.GetString("date_start"))
	dateEnd := strings.TrimSpace(meta.GetString("date_end"))
	if dateStart == "" || dateEnd == "" {
		state.Output = "Cannot create post schedule: date_start and date_end are required in the request."
		return nil
	}

	holidays, err := parseNationalHolidays(meta.GetString("national_holidays"))
	if err != nil {
		log.Printf("post schedule: national_holidays parse: %v", err)
		holidays = nil
	}

	candidateWeeks, err := buildCandidateWeeks(dateStart, dateEnd, holidays)
	if err != nil {
		state.Output = fmt.Sprintf("Cannot create post schedule: invalid date range: %v", err)
		return nil
	}
	if len(candidateWeeks) == 0 {
		state.Output = "Cannot create post schedule: no candidate days in the campaign window."
		return nil
	}

	ctx, cancel := context.WithTimeout(ctx, 5*time.Minute)
	defer cancel()

	n := gen.NotifierFromContext(ctx)
	n.Notify("create_post_schedule", gen.ActivityRunning, "Create Instagram post schedule")

	llm := openai.Provider{}
	model := s.Model
	if model == "" {
		model = openai.DefaultModel
	}

	refSnap := buildScheduleReflectionSnapshot(candidateWeeks, holidays)
	genPrompt := buildScheduleGenerationPrompt(profile.Summary, holidays, candidateWeeks)

	n.Notify("create_post_schedule", gen.ActivityDone, "Create Instagram post schedule")

	totalRefine := s.MaxReflectionIterations + 1
	rawDraft, err := reflect.RunReflectLoop(ctx, reflect.ReflectLoopParams{
		LLM:                    llm,
		Model:                  model,
		MaxIterations:          s.MaxReflectionIterations,
		GenerationSystemPrompt: scheduleGenerationSystem,
		ReflectionSystemPrompt: scheduleReflectionSystem,
		GenerationPrompt:       genPrompt,
		BuildReflectionUser: func(draft string) string {
			return buildScheduleReflectionUser(refSnap, draft)
		},
		BuildRevisionPrompt: buildScheduleRevisionPrompt,
		OnIteration: func(ctx context.Context, current, total int) {
			nn := gen.NotifierFromContext(ctx)
			nn.Notify("post_schedule_refinement", gen.ActivityReflecting,
				fmt.Sprintf("Refining (%d/%d)", current, total))
		},
	})
	if err != nil {
		return err
	}
	n.Notify("post_schedule_refinement", gen.ActivityDone,
		fmt.Sprintf("Refining (%d/%d)", totalRefine, totalRefine))

	schedule, err := parseScheduleJSON(rawDraft)
	if err != nil {
		return fmt.Errorf("post schedule: parse LLM output: %w", err)
	}

	injected := injectPinnedSlots(schedule, candidateWeeks)
	final := validateAndClamp(injected, candidateWeeks)

	state.SetMetadata(metadataKeyPostSchedule, final)

	notify, err := llm.Chat(ctx, model, scheduleNotifySystem, buildPostScheduleNotifyPrompt(final))
	if err != nil {
		notify = fallbackPostScheduleMessage(final)
	} else {
		notify = strings.TrimSpace(notify)
		if notify == "" {
			notify = fallbackPostScheduleMessage(final)
		}
	}

	state.Output = notify + "\n\n" + formatPostScheduleForUser(final)

	detail := campaignIDFromMetadata(state)
	if detail == "" {
		detail = state.SecureMetadata().GetString("thread_id")
	}
	n.Notify("post_schedule_ready", gen.ActivityDone, "Post schedule ready", gen.WithDetail(detail))
	return nil
}

func parseNationalHolidays(raw string) ([]nationalHoliday, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" || raw == "null" {
		return nil, nil
	}
	var out []nationalHoliday
	if err := json.Unmarshal([]byte(raw), &out); err != nil {
		return nil, err
	}
	return out, nil
}

func buildCandidateWeeks(dateStart, dateEnd string, holidays []nationalHoliday) ([]candidateWeek, error) {
	start, err := time.Parse("2006-01-02", dateStart)
	if err != nil {
		return nil, err
	}
	end, err := time.Parse("2006-01-02", dateEnd)
	if err != nil {
		return nil, err
	}
	if end.Before(start) {
		return nil, fmt.Errorf("date_end before date_start")
	}

	holidayByDate := make(map[string]string)
	for _, h := range holidays {
		if h.Date != "" && h.ID != "" {
			holidayByDate[h.Date] = h.ID
		}
	}

	weeks := make(map[int][]time.Time)
	for d := start; !d.After(end); d = d.AddDate(0, 0, 1) {
		weekNum := int(d.Sub(start).Hours()/24)/7 + 1
		weeks[weekNum] = append(weeks[weekNum], d)
	}

	var keys []int
	for k := range weeks {
		keys = append(keys, k)
	}
	sort.Ints(keys)

	var out []candidateWeek
	for _, weekNum := range keys {
		days := weeks[weekNum]
		var slots []candidateSlot
		for _, d := range days {
			dateStr := d.Format("2006-01-02")
			prevStr := d.AddDate(0, 0, -1).Format("2006-01-02")
			nextStr := d.AddDate(0, 0, 1).Format("2006-01-02")

			hid := holidayByDate[dateStr]
			nextHid := holidayByDate[nextStr]
			prevHid := holidayByDate[prevStr]

			var proximity string
			switch {
			case hid != "":
				proximity = ""
			case nextHid != "":
				proximity = "day_before_" + nextHid
			case prevHid != "":
				proximity = "day_after_" + prevHid
			}

			slots = append(slots, candidateSlot{
				Date:       dateStr,
				DayName:    d.Weekday().String(),
				WeekNumber: weekNum,
				HolidayID:  hid,
				Proximity:  proximity,
				IsPinned:   hid != "",
			})
		}
		wkLabel := fmt.Sprintf("%s %d – %s %d",
			days[0].Month().String()[:3], days[0].Day(),
			days[len(days)-1].Month().String()[:3], days[len(days)-1].Day())
		out = append(out, candidateWeek{
			WeekNumber: weekNum,
			WeekLabel:  wkLabel,
			IsPartial:  len(days) < minDaysFullWeek,
			Slots:      slots,
		})
	}
	return out, nil
}

func formatHolidaysForPrompt(holidays []nationalHoliday) string {
	if len(holidays) == 0 {
		return "None"
	}
	var b strings.Builder
	for _, h := range holidays {
		name := h.Name
		if name == "" {
			name = "holiday"
		}
		fmt.Fprintf(&b, "- [%s] %s — %s\n", h.ID, h.Date, name)
	}
	return strings.TrimSuffix(b.String(), "\n")
}

func formatCandidateWeeks(weeks []candidateWeek) string {
	var lines []string
	for _, week := range weeks {
		pinnedCount := 0
		for _, s := range week.Slots {
			if s.IsPinned {
				pinnedCount++
			}
		}
		var note string
		if week.IsPartial {
			note = " (partial week — select at least 1 more)"
		} else {
			remainingMin := max(0, minPostsFullWeek-pinnedCount)
			remainingMax := max(0, maxPostsPerWeek-pinnedCount)
			if pinnedCount > 0 {
				note = fmt.Sprintf(" (select %d to %d more; %d holiday already pinned)", remainingMin, remainingMax, pinnedCount)
			} else {
				note = fmt.Sprintf(" (select %d to %d)", minPostsFullWeek, maxPostsPerWeek)
			}
		}
		lines = append(lines, fmt.Sprintf("## Week %d — %s%s", week.WeekNumber, week.WeekLabel, note))
		for _, slot := range week.Slots {
			var annotation string
			switch {
			case slot.IsPinned:
				annotation = fmt.Sprintf("  [PINNED — %s]", slot.HolidayID)
			case slot.Proximity != "":
				annotation = fmt.Sprintf("  (%s)", slot.Proximity)
			}
			lines = append(lines, fmt.Sprintf("- %s  %s%s", slot.Date, slot.DayName, annotation))
		}
		lines = append(lines, "")
	}
	return strings.TrimSpace(strings.Join(lines, "\n"))
}

func buildScheduleGenerationPrompt(locationSummary string, holidays []nationalHoliday, candidateWeeks []candidateWeek) string {
	return fmt.Sprintf(`You are scheduling Instagram posts for a restaurant.

Campaign context (location / marketing profile):
%s

Public holidays during this period (canonical list — do not invent or move dates):
%s

The holiday list above is the authoritative source of truth. Do not treat any date as a public holiday unless it appears in that list with a [HOLIDAY_ID] tag. Dates marked [HOLIDAY_ID] in the candidate list below are the exact holiday dates.

Operating data (use the profile above when a field is N/A):
- Peak day: N/A
- Weekend / weekday split: N/A
- Primary meal period: N/A

For each week below, select the best posting dates to maximise engagement:
- Dates marked [PINNED — HOLIDAY_ID] are public holidays and are already included in the schedule — do NOT re-select them.
- For each full week, select only the additional dates indicated in the week header (e.g. "select 2 to 4 more").
- For partial weeks (marked as such), select at least 1 more date.
- Prefer peak days, weekends (if weekend share is significant), and days adjacent to public holidays.

%s

Return a single JSON object with exactly this shape (double quotes, no markdown fences):
{
  "weeks": [
    {"week_number": <int>, "selected_dates": ["YYYY-MM-DD", ...]}
  ]
}

Include one entry per campaign week shown above, in order. selected_dates must use only dates listed under that week.`,
		strings.TrimSpace(locationSummary),
		formatHolidaysForPrompt(holidays),
		formatCandidateWeeks(candidateWeeks))
}

func buildScheduleReflectionSnapshot(candidateWeeks []candidateWeek, holidays []nationalHoliday) string {
	var b strings.Builder
	b.WriteString("Canonical holidays:\n")
	b.WriteString(formatHolidaysForPrompt(holidays))
	b.WriteString("\n\nValid dates by week_number (for validation):\n")
	for _, w := range candidateWeeks {
		var dates []string
		for _, s := range w.Slots {
			dates = append(dates, s.Date)
		}
		b.WriteString(fmt.Sprintf("- week %d: %s\n", w.WeekNumber, strings.Join(dates, ", ")))
	}
	return b.String()
}

func buildScheduleReflectionUser(snapshot, draft string) string {
	return snapshot + `

Generated JSON schedule to review:
` + draft + `

Evaluate against every criterion below. If ALL criteria are met, respond with exactly:
PASS

If ANY criterion fails, respond with:
IMPROVE:
- <specific issue 1>
- <specific issue 2>

Criteria:
1. The response is valid JSON with exactly one top-level key "weeks" whose value is an array of objects with week_number (integer) and selected_dates (array of ISO date strings YYYY-MM-DD)

2. There is exactly one object per campaign week listed in the snapshot (same week_number set)

3. Every selected_date appears under the correct week and exists in that week's valid date list for that week_number

4. For each full (non-partial) week, total selected_dates for that week is between 3 and 5 after accounting for pinned holidays (pinned holiday dates must appear in selected_dates)

5. For each partial week, at least one date is selected in addition to any pinned holidays

6. All public holiday dates from the canonical list that fall in a week are included in selected_dates for that week (pinned)

7. No invented dates outside the valid lists`
}

func buildScheduleRevisionPrompt(originalGenerationPrompt, previousDraft, feedback string) string {
	return fmt.Sprintf(`You are scheduling Instagram posts for a restaurant. Revise the JSON schedule below based on reviewer feedback.

%s

---
Previous draft (valid JSON only — improve it, do not add markdown fences):
%s

Reviewer feedback — address every point:
%s

Write the improved JSON object now, with the same structure: {"weeks":[{"week_number":...,"selected_dates":[...]}, ...]}.`,
		originalGenerationPrompt,
		previousDraft,
		feedback,
	)
}

func parseScheduleJSON(raw string) (*PostSchedule, error) {
	s := strings.TrimSpace(raw)
	s = strings.TrimPrefix(s, "```json")
	s = strings.TrimPrefix(s, "```JSON")
	s = strings.TrimPrefix(s, "```")
	s = strings.TrimSpace(s)
	if i := strings.LastIndex(s, "```"); i >= 0 {
		s = strings.TrimSpace(s[:i])
	}

	var payload PostSchedule
	if err := json.Unmarshal([]byte(s), &payload); err != nil {
		return nil, err
	}
	if len(payload.Weeks) == 0 {
		return nil, fmt.Errorf("empty weeks")
	}
	return &payload, nil
}

func injectPinnedSlots(schedule *PostSchedule, candidateWeeks []candidateWeek) *PostSchedule {
	pinnedByWeek := make(map[int][]string)
	for _, w := range candidateWeeks {
		var pinned []string
		for _, s := range w.Slots {
			if s.IsPinned {
				pinned = append(pinned, s.Date)
			}
		}
		pinnedByWeek[w.WeekNumber] = pinned
	}

	var weeks []WeekSelection
	for _, ws := range schedule.Weeks {
		pinned := pinnedByWeek[ws.WeekNumber]
		merged := append(append([]string{}, pinned...), ws.SelectedDates...)
		seen := make(map[string]struct{})
		var dedup []string
		for _, d := range merged {
			if _, ok := seen[d]; ok {
				continue
			}
			seen[d] = struct{}{}
			dedup = append(dedup, d)
		}
		weeks = append(weeks, WeekSelection{
			WeekNumber:    ws.WeekNumber,
			SelectedDates: dedup,
		})
	}
	return &PostSchedule{Weeks: weeks}
}

func validateAndClamp(schedule *PostSchedule, candidateWeeks []candidateWeek) *PostSchedule {
	validDatesByWeek := make(map[int]map[string]struct{})
	pinnedByWeek := make(map[int]map[string]struct{})
	isPartialByWeek := make(map[int]bool)
	for _, w := range candidateWeeks {
		vm := make(map[string]struct{})
		pm := make(map[string]struct{})
		for _, s := range w.Slots {
			vm[s.Date] = struct{}{}
			if s.IsPinned {
				pm[s.Date] = struct{}{}
			}
		}
		validDatesByWeek[w.WeekNumber] = vm
		pinnedByWeek[w.WeekNumber] = pm
		isPartialByWeek[w.WeekNumber] = w.IsPartial
	}

	var cleaned []WeekSelection
	for _, ws := range schedule.Weeks {
		valid := validDatesByWeek[ws.WeekNumber]
		pinned := pinnedByWeek[ws.WeekNumber]
		var filtered []string
		for _, d := range ws.SelectedDates {
			if _, ok := valid[d]; ok {
				filtered = append(filtered, d)
			} else if valid != nil {
				log.Printf("post schedule: week %d removed invalid date %s", ws.WeekNumber, d)
			}
		}
		var pinnedSel, nonPinned []string
		for _, d := range filtered {
			if _, ok := pinned[d]; ok {
				pinnedSel = append(pinnedSel, d)
			} else {
				nonPinned = append(nonPinned, d)
			}
		}
		remainingCap := max(0, maxPostsPerWeek-len(pinnedSel))
		clamped := append(pinnedSel, nonPinned[:min(len(nonPinned), remainingCap)]...)

		if !isPartialByWeek[ws.WeekNumber] && len(clamped) < minPostsFullWeek {
			log.Printf("post schedule: week %d only %d dates (min %d for full week)", ws.WeekNumber, len(clamped), minPostsFullWeek)
		}
		cleaned = append(cleaned, WeekSelection{
			WeekNumber:    ws.WeekNumber,
			SelectedDates: clamped,
		})
	}
	return &PostSchedule{Weeks: cleaned}
}

func postScheduleStats(ps *PostSchedule) (posts, weeks int) {
	if ps == nil {
		return 0, 0
	}
	for _, w := range ps.Weeks {
		posts += len(w.SelectedDates)
	}
	return posts, len(ps.Weeks)
}

func buildPostScheduleNotifyPrompt(ps *PostSchedule) string {
	posts, weeks := postScheduleStats(ps)
	return fmt.Sprintf(`An Instagram post schedule was just prepared with %d post date(s) across %d week(s).

Write 2–3 short sentences confirming the schedule is ready. Do not list every date.`,
		posts, weeks)
}

func fallbackPostScheduleMessage(ps *PostSchedule) string {
	posts, weeks := postScheduleStats(ps)
	return fmt.Sprintf("Your Instagram post schedule is ready with %d post date(s) across %d week(s). Details are below.", posts, weeks)
}

func formatPostScheduleForUser(ps *PostSchedule) string {
	var b strings.Builder
	b.WriteString("**Post schedule**\n\n")
	for _, w := range ps.Weeks {
		fmt.Fprintf(&b, "**Week %d:** %s\n\n", w.WeekNumber, strings.Join(w.SelectedDates, ", "))
	}
	return strings.TrimSpace(b.String())
}
