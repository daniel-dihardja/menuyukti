package promotion

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/daniel-dihardja/gentic-agents/internal/agent/flowstate"
	"github.com/daniel-dihardja/gentic-agents/internal/agent/step"
	"github.com/daniel-dihardja/gentic-agents/internal/platform/graphql"
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
	"github.com/daniel-dihardja/gentic/pkg/gentic/reflect"
	"github.com/daniel-dihardja/gentic/pkg/providers/openai"
)

const (
	assignPostFormatGenerationSystem = "You are deciding Instagram post formats for a restaurant campaign. Follow the instructions precisely."
	assignPostFormatReflectionSystem = "You are a quality reviewer for Instagram promotion post format plans."
)

// FormatsStep assigns single vs carousel and item groupings per promotion date.
type FormatsStep struct {
	LLM                     gen.LLM // nil → openai.Provider{}
	Model                   string
	MaxReflectionIterations int
}

// Run implements gen.Step.
func (s FormatsStep) Run(ctx context.Context, state *gen.State) error {
	if flowstate.HasPostFormatPlan(state) {
		return nil
	}

	if _, _, ok := flowstate.RequiredLocationIDs(state, "assign post formats"); !ok {
		return nil
	}

	selected, ok := flowstate.SelectedPromotionItemsFromMetadata(state)
	if !ok || len(selected) == 0 {
		return nil
	}

	ps, ok := flowstate.PostScheduleFromMetadata(state)
	if !ok || ps == nil {
		state.Output = "Cannot assign post formats: post schedule is missing."
		return nil
	}

	promotionDates := distinctSortedDates(ps)
	if len(promotionDates) == 0 {
		return nil
	}

	meta := state.SecureMetadata()
	holidayByDate := holidayDatesByDate(meta.GetString("national_holidays"))
	dateToWeek := dateToWeekNumber(ps)

	slotsBlock := formatPromotionSlotsForPrompt(ps, holidayByDate)
	itemsBlock := flowstate.FormatItemsForPrompt(selected)

	ctx, cancel := context.WithTimeout(ctx, 5*time.Minute)
	defer cancel()

	n := gen.NotifierFromContext(ctx)
	n.Notify("assign_post_formats", gen.ActivityRunning, "Assign post formats")

	llm := s.LLM
	if llm == nil {
		llm = openai.Provider{}
	}
	model := s.Model
	if model == "" {
		model = openai.DefaultModel
	}

	genPrompt := buildAssignPostFormatsUserPrompt(len(promotionDates), len(selected), slotsBlock, itemsBlock)
	refSnap := buildAssignPostFormatsReflectionSnapshot(itemsBlock)

	totalRefine := s.MaxReflectionIterations + 1
	ctxParams := assignFormatContext{
		promotionDates: promotionDates,
		selectedItems:  selected,
		dateToWeek:     dateToWeek,
		holidayByDate:  holidayByDate,
	}

	planVal, err := reflect.RunTypedReflectLoop[flowstate.PostFormatPlan](ctx, reflect.ReflectLoopParams{
		LLM:                    llm,
		Model:                  model,
		MaxIterations:          s.MaxReflectionIterations,
		GenerationSystemPrompt: assignPostFormatGenerationSystem,
		ReflectionSystemPrompt: assignPostFormatReflectionSystem,
		GenerationPrompt:       genPrompt,
		BuildReflectionUser: func(draft string) string {
			return buildAssignPostFormatsReflectionUser(refSnap, draft)
		},
		BuildRevisionPrompt: buildAssignPostFormatsRevisionPrompt,
		OnIteration: func(ctx context.Context, current, total int) {
			nn := gen.NotifierFromContext(ctx)
			nn.Notify("assign_post_formats_refinement", gen.ActivityReflecting,
				fmt.Sprintf("Refining formats (%d/%d)", current, total))
		},
	})
	if err != nil {
		n.Notify("assign_post_formats_refinement", gen.ActivityDone, "Refining formats (failed)")
		msg := err.Error()
		if len(msg) > 180 {
			msg = msg[:180] + "…"
		}
		n.Notify("assign_post_formats", gen.ActivityDone, "Assign post formats failed: "+msg)
		return fmt.Errorf("assign post formats: %w", err)
	}
	plan, err := validatePostFormatPlan(&planVal, ctxParams)
	if err != nil {
		n.Notify("assign_post_formats_refinement", gen.ActivityDone, "Refining formats (failed)")
		msg := err.Error()
		if len(msg) > 180 {
			msg = msg[:180] + "…"
		}
		n.Notify("assign_post_formats", gen.ActivityDone, "Assign post formats failed: "+msg)
		return fmt.Errorf("assign post formats: %w", err)
	}

	n.Notify("assign_post_formats_refinement", gen.ActivityDone,
		fmt.Sprintf("Refining formats (%d/%d)", totalRefine, totalRefine))

	state.SetMetadata(flowstate.KeyPostFormatPlan, plan)

	step.EmitPlanningProgress(ctx, state)

	var singleN, carouselN int
	for _, a := range plan.Assignments {
		if normalizePostFormat(a.Format) == "carousel" {
			carouselN++
		} else {
			singleN++
		}
	}
	n.Notify("assign_post_formats", gen.ActivityDone, fmt.Sprintf("%d single · %d carousel", singleN, carouselN))
	return nil
}

type assignFormatContext struct {
	promotionDates []string
	selectedItems  []graphql.MenuEngineeringItem
	dateToWeek     map[string]int
	holidayByDate  map[string]struct{}
}

func distinctSortedDates(ps *flowstate.PostSchedule) []string {
	seen := map[string]struct{}{}
	for _, w := range ps.Weeks {
		for _, d := range w.SelectedDates {
			if d != "" {
				seen[d] = struct{}{}
			}
		}
	}
	var dates []string
	for d := range seen {
		dates = append(dates, d)
	}
	sort.Strings(dates)
	return dates
}

func dateToWeekNumber(ps *flowstate.PostSchedule) map[string]int {
	m := map[string]int{}
	for _, w := range ps.Weeks {
		for _, d := range w.SelectedDates {
			if d != "" {
				m[d] = w.WeekNumber
			}
		}
	}
	return m
}

func holidayDatesByDate(nationalHolidaysJSON string) map[string]struct{} {
	out := map[string]struct{}{}
	raw := strings.TrimSpace(nationalHolidaysJSON)
	if raw == "" || raw == "null" {
		return out
	}
	var holidays []struct {
		Date string `json:"date"`
	}
	if err := json.Unmarshal([]byte(raw), &holidays); err != nil {
		return out
	}
	for _, h := range holidays {
		if h.Date != "" {
			out[h.Date] = struct{}{}
		}
	}
	return out
}

func formatPromotionSlotsForPrompt(ps *flowstate.PostSchedule, holidayByDate map[string]struct{}) string {
	var b strings.Builder
	for _, w := range ps.Weeks {
		if len(w.SelectedDates) == 0 {
			continue
		}
		fmt.Fprintf(&b, "Week %d:\n", w.WeekNumber)
		dates := append([]string(nil), w.SelectedDates...)
		sort.Strings(dates)
		for _, d := range dates {
			ann := ""
			if _, ok := holidayByDate[d]; ok {
				ann = "  [HOLIDAY]"
			}
			fmt.Fprintf(&b, "  - %s%s\n", d, ann)
		}
	}
	s := strings.TrimSpace(b.String())
	if s == "" {
		return "(no dates)"
	}
	return s
}

func buildAssignPostFormatsUserPrompt(slotCount, itemCount int, promotionSlots, promotionItems string) string {
	return fmt.Sprintf(`You are deciding Instagram post formats for a restaurant campaign.

Your job is to assign a format (single post or carousel) to each promotion date and decide which menu items to feature on it.

Available posting dates — %d dates total:
%s

Menu items available for promotion (%d items):
%s

Rules:
- Use ONLY the dates listed above. Do NOT invent or add any dates not in the list.
- You may use fewer than %d dates — unused dates will become engagement posts. But you MUST NOT exceed %d assignments.
- Use carousels to group multiple items onto one date rather than adding extra dates.
- "star" category items must always be assigned as format="single" — they deserve a solo spotlight.
- "puzzle" and "plow_horse" category items are carousel candidates if they share a menu category or customer theme (e.g. all drinks, all snacks, all value sets).
- Holiday-pinned dates (marked [HOLIDAY]) must always be format="single".
- A maximum of 2 carousel posts per week.
- Carousel posts must group 2 to 4 items. Each item may appear in at most one post.
- Fit as many items as possible, prioritising high-value items. Low-priority items may be left out if dates are insufficient.
- Item distribution targets across assignments:
  - STAR items ≈ 60–70%% of assignments
  - PUZZLE items ≈ 20–30%% of assignments
  - PLOW_HORSE items ≤ 10%% of assignments
- Use format="carousel" with 2–4 items when you can group puzzle and/or plow_horse dishes that share a theme (stars cannot be in carousels). Prefer at least one carousel per week when the selected list contains non-star items.

Return a single JSON object:
{
  "assignments": [
    {
      "scheduled_date": "<YYYY-MM-DD from the list above>",
      "format": "single" | "carousel",
      "items": ["<menu name>", ...],
      "carousel_narrative": "<short angle for carousel, or null for single>"
    }
  ]
}

For format "single", items must contain exactly one menu name. For "carousel", 2–4 names. Use exact menu names from the list.`,
		slotCount,
		promotionSlots,
		itemCount,
		promotionItems,
		slotCount,
		slotCount,
	)
}

func buildAssignPostFormatsReflectionSnapshot(itemsBlock string) string {
	s := itemsBlock
	if len(s) > 500 {
		s = s[:500] + "…"
	}
	return "Promotion items excerpt:\n" + s
}

func buildAssignPostFormatsReflectionUser(snapshot, draft string) string {
	return snapshot + `

Generated JSON plan to review:
` + draft + `

Evaluate against every criterion below. If ALL criteria are met, respond with exactly:
PASS

If ANY criterion fails, respond with:
IMPROVE:
- <specific issue 1>

Criteria:
1. Valid JSON with assignments array
2. Dates are valid, star items are not in carousels, holidays are single format
3. Carousels have 2–4 items and a narrative; weekly carousel cap respected
4. Menu names match the candidate list`
}

func buildAssignPostFormatsRevisionPrompt(originalGenerationPrompt, previousDraft, feedback string) string {
	return fmt.Sprintf(`Revise the JSON post format plan based on reviewer feedback.

%s

---
Previous draft:
%s

Reviewer feedback — address every point:
%s

Write the improved JSON object now.`,
		originalGenerationPrompt,
		previousDraft,
		feedback,
	)
}

func validatePostFormatPlan(plan *flowstate.PostFormatPlan, ctx assignFormatContext) (*flowstate.PostFormatPlan, error) {
	if plan == nil {
		return nil, fmt.Errorf("nil plan")
	}
	plan.Assignments = sanitizeAssignments(plan.Assignments, ctx.promotionDates)
	repairAssignmentCoverage(plan, ctx)
	maybeMergeSinglesIntoCarousels(plan, ctx)
	failures := checkHardConstraints(plan, ctx)
	if len(failures) > 0 {
		return nil, fmt.Errorf("%s", strings.Join(failures, "; "))
	}
	return plan, nil
}

func normalizePostFormat(s string) string {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "carousel":
		return "carousel"
	default:
		return "single"
	}
}

// repairAssignmentCoverage fixes common LLM mistakes: duplicate items across dates, missing dishes,
// invalid star/holiday carousels, so validatePostFormatPlan can succeed without another LLM round.
func repairAssignmentCoverage(plan *flowstate.PostFormatPlan, ctx assignFormatContext) {
	if plan == nil {
		return
	}
	expectedNames := map[string]struct{}{}
	starNames := map[string]struct{}{}
	for _, it := range ctx.selectedItems {
		n := strings.TrimSpace(it.Menu)
		if n == "" {
			continue
		}
		expectedNames[n] = struct{}{}
		if strings.EqualFold(strings.TrimSpace(it.Category), "star") {
			starNames[n] = struct{}{}
		}
	}
	assignments := append([]flowstate.PostFormatAssignment(nil), plan.Assignments...)
	sort.Slice(assignments, func(i, j int) bool {
		return assignments[i].ScheduledDate < assignments[j].ScheduledDate
	})

	seen := map[string]struct{}{}
	var out []flowstate.PostFormatAssignment
	var spill []string

	for _, a := range assignments {
		d := strings.TrimSpace(a.ScheduledDate)
		if d == "" {
			continue
		}
		var items []string
		for _, name := range a.Items {
			n := strings.TrimSpace(name)
			if n == "" {
				continue
			}
			if _, ok := expectedNames[n]; !ok {
				continue
			}
			if _, ok := seen[n]; ok {
				continue
			}
			seen[n] = struct{}{}
			items = append(items, n)
		}
		if len(items) == 0 {
			continue
		}
		holiday := false
		if _, ok := ctx.holidayByDate[d]; ok {
			holiday = true
		}
		one, extra := reshapeItemsForDate(d, items, starNames, holiday)
		if len(one.Items) > 0 {
			out = append(out, one)
		}
		spill = append(spill, extra...)
	}

	for n := range expectedNames {
		if _, ok := seen[n]; !ok {
			spill = append(spill, n)
		}
	}
	spill = dedupeStringsPreserveOrder(spill)

	usedDates := map[string]struct{}{}
	for _, a := range out {
		usedDates[a.ScheduledDate] = struct{}{}
	}
	var free []string
	for _, d := range ctx.promotionDates {
		if _, ok := usedDates[d]; !ok {
			free = append(free, d)
		}
	}

	out = append(out, placeSpillOnFreeDates(spill, free, starNames, ctx.holidayByDate)...)
	sort.Slice(out, func(i, j int) bool {
		return out[i].ScheduledDate < out[j].ScheduledDate
	})
	plan.Assignments = out
}

func dedupeStringsPreserveOrder(in []string) []string {
	seen := map[string]struct{}{}
	var out []string
	for _, s := range in {
		s = strings.TrimSpace(s)
		if s == "" {
			continue
		}
		if _, ok := seen[s]; ok {
			continue
		}
		seen[s] = struct{}{}
		out = append(out, s)
	}
	return out
}

func defaultCarouselNarrative() *string {
	s := "Two highlights in one scroll."
	return &s
}

// reshapeItemsForDate returns one assignment for this date and items that must be placed elsewhere.
func reshapeItemsForDate(date string, items []string, starNames map[string]struct{}, holiday bool) (flowstate.PostFormatAssignment, []string) {
	var spill []string
	if len(items) == 0 {
		return flowstate.PostFormatAssignment{}, nil
	}
	if holiday {
		if len(items) == 1 {
			return flowstate.PostFormatAssignment{
				ScheduledDate: date,
				Format:        "single",
				Items:         items,
			}, nil
		}
		spill = append(spill, items[1:]...)
		return flowstate.PostFormatAssignment{
			ScheduledDate: date,
			Format:        "single",
			Items:         []string{items[0]},
		}, spill
	}
	if len(items) == 1 {
		return flowstate.PostFormatAssignment{
			ScheduledDate: date,
			Format:        "single",
			Items:         items,
		}, nil
	}
	hasStar := false
	for _, n := range items {
		if _, ok := starNames[strings.TrimSpace(n)]; ok {
			hasStar = true
			break
		}
	}
	if hasStar {
		spill = append(spill, items[1:]...)
		return flowstate.PostFormatAssignment{
			ScheduledDate: date,
			Format:        "single",
			Items:         []string{items[0]},
		}, spill
	}
	if len(items) > 4 {
		spill = append(spill, items[4:]...)
		items = items[:4]
	}
	return flowstate.PostFormatAssignment{
		ScheduledDate:     date,
		Format:            "carousel",
		Items:             items,
		CarouselNarrative: defaultCarouselNarrative(),
	}, spill
}

func packSpillChunk(rest []string, starNames map[string]struct{}) (items []string, consumed int) {
	if len(rest) == 0 {
		return nil, 0
	}
	if _, ok := starNames[strings.TrimSpace(rest[0])]; ok {
		return []string{rest[0]}, 1
	}
	n := 0
	for n < len(rest) && n < 4 {
		if _, ok := starNames[strings.TrimSpace(rest[n])]; ok {
			break
		}
		n++
	}
	if n >= 2 {
		return rest[:n], n
	}
	return []string{rest[0]}, 1
}

func placeSpillOnFreeDates(spill []string, freeDates []string, starNames map[string]struct{}, holidayByDate map[string]struct{}) []flowstate.PostFormatAssignment {
	spill = dedupeStringsPreserveOrder(spill)
	if len(spill) == 0 || len(freeDates) == 0 {
		return nil
	}
	var out []flowstate.PostFormatAssignment
	si := 0
	for fi := 0; fi < len(freeDates) && si < len(spill); fi++ {
		d := freeDates[fi]
		if _, hol := holidayByDate[d]; hol {
			out = append(out, flowstate.PostFormatAssignment{
				ScheduledDate: d,
				Format:        "single",
				Items:         []string{spill[si]},
			})
			si++
			continue
		}
		items, consumed := packSpillChunk(spill[si:], starNames)
		if len(items) == 1 {
			out = append(out, flowstate.PostFormatAssignment{
				ScheduledDate: d,
				Format:        "single",
				Items:         items,
			})
		} else {
			out = append(out, flowstate.PostFormatAssignment{
				ScheduledDate:     d,
				Format:            "carousel",
				Items:             items,
				CarouselNarrative: defaultCarouselNarrative(),
			})
		}
		si += consumed
	}
	return out
}

// maybeMergeSinglesIntoCarousels pairs two non-star singles on non-holiday dates in the same week into one
// carousel when the model returned only singles but carousel posts are valid — keeps hard constraints satisfied.
func maybeMergeSinglesIntoCarousels(plan *flowstate.PostFormatPlan, ctx assignFormatContext) {
	if plan == nil || len(plan.Assignments) < 2 {
		return
	}
	for _, a := range plan.Assignments {
		if normalizePostFormat(a.Format) == "carousel" {
			return
		}
	}
	starNames := starMenuNamesFromMatrix(ctx.selectedItems)
	assignments := append([]flowstate.PostFormatAssignment(nil), plan.Assignments...)
	sort.Slice(assignments, func(i, j int) bool {
		return assignments[i].ScheduledDate < assignments[j].ScheduledDate
	})
	byWeek := map[int][]flowstate.PostFormatAssignment{}
	for _, a := range assignments {
		if normalizePostFormat(a.Format) != "single" || len(a.Items) != 1 {
			continue
		}
		name := strings.TrimSpace(a.Items[0])
		if _, ok := starNames[name]; ok {
			continue
		}
		if _, ok := ctx.holidayByDate[a.ScheduledDate]; ok {
			continue
		}
		wk := ctx.dateToWeek[a.ScheduledDate]
		byWeek[wk] = append(byWeek[wk], a)
	}
	merged := map[string]flowstate.PostFormatAssignment{}
	consumed := map[string]struct{}{}
	for _, list := range byWeek {
		if len(list) < 2 {
			continue
		}
		sort.Slice(list, func(i, j int) bool {
			return list[i].ScheduledDate < list[j].ScheduledDate
		})
		a0, a1 := list[0], list[1]
		n0 := strings.TrimSpace(a0.Items[0])
		n1 := strings.TrimSpace(a1.Items[0])
		if n0 == "" || n1 == "" {
			continue
		}
		narr := "Two highlights in one scroll."
		merged[a0.ScheduledDate] = flowstate.PostFormatAssignment{
			ScheduledDate:     a0.ScheduledDate,
			Format:            "carousel",
			Items:             []string{n0, n1},
			CarouselNarrative: &narr,
		}
		consumed[a1.ScheduledDate] = struct{}{}
	}
	if len(merged) == 0 {
		return
	}
	var out []flowstate.PostFormatAssignment
	for _, a := range assignments {
		if _, ok := consumed[a.ScheduledDate]; ok {
			continue
		}
		if m, ok := merged[a.ScheduledDate]; ok {
			out = append(out, m)
			continue
		}
		out = append(out, a)
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].ScheduledDate < out[j].ScheduledDate
	})
	plan.Assignments = out
}

func starMenuNamesFromMatrix(items []graphql.MenuEngineeringItem) map[string]struct{} {
	out := map[string]struct{}{}
	for _, it := range items {
		if !strings.EqualFold(strings.TrimSpace(it.Category), "star") {
			continue
		}
		n := strings.TrimSpace(it.Menu)
		if n != "" {
			out[n] = struct{}{}
		}
	}
	return out
}

func sanitizeAssignments(assignments []flowstate.PostFormatAssignment, validDates []string) []flowstate.PostFormatAssignment {
	slotSet := map[string]struct{}{}
	for _, d := range validDates {
		slotSet[d] = struct{}{}
	}
	seen := map[string]struct{}{}
	var kept []flowstate.PostFormatAssignment
	for _, a := range assignments {
		d := strings.TrimSpace(a.ScheduledDate)
		if _, ok := slotSet[d]; !ok {
			continue
		}
		if _, ok := seen[d]; ok {
			continue
		}
		seen[d] = struct{}{}
		a.ScheduledDate = d
		a.Format = normalizePostFormat(a.Format)
		kept = append(kept, a)
	}
	if len(kept) > len(validDates) {
		kept = kept[:len(validDates)]
	}
	return kept
}

func checkHardConstraints(plan *flowstate.PostFormatPlan, ctx assignFormatContext) []string {
	var failures []string
	slotSet := map[string]struct{}{}
	for _, d := range ctx.promotionDates {
		slotSet[d] = struct{}{}
	}

	if len(plan.Assignments) > len(ctx.promotionDates) {
		failures = append(failures, fmt.Sprintf("too many assignments (%d) for %d available dates", len(plan.Assignments), len(ctx.promotionDates)))
	}

	expectedNames := map[string]struct{}{}
	starNames := map[string]struct{}{}
	for _, it := range ctx.selectedItems {
		n := strings.TrimSpace(it.Menu)
		if n == "" {
			continue
		}
		expectedNames[n] = struct{}{}
		// BCG quadrant is "category" (star/puzzle/plow_horse/low_end); "action" is keep/promote/etc.
		if strings.EqualFold(strings.TrimSpace(it.Category), "star") {
			starNames[n] = struct{}{}
		}
	}

	var assignedNames []string
	for _, a := range plan.Assignments {
		if _, ok := slotSet[a.ScheduledDate]; !ok {
			failures = append(failures, fmt.Sprintf("unknown date %s", a.ScheduledDate))
			continue
		}
		for _, name := range a.Items {
			n := strings.TrimSpace(name)
			if n == "" {
				continue
			}
			if _, ok := expectedNames[n]; !ok {
				failures = append(failures, fmt.Sprintf("item %q not in selected promotion list", n))
			}
			assignedNames = append(assignedNames, n)
		}
	}

	for name := range expectedNames {
		found := false
		for _, n := range assignedNames {
			if n == name {
				found = true
				break
			}
		}
		if !found {
			failures = append(failures, fmt.Sprintf("item not assigned to any post: %s", name))
		}
	}

	counts := map[string]int{}
	for _, n := range assignedNames {
		counts[n]++
	}
	for n, c := range counts {
		if c > 1 {
			failures = append(failures, fmt.Sprintf("item %q appears in more than one post", n))
		}
	}

	for _, a := range plan.Assignments {
		if normalizePostFormat(a.Format) == "carousel" {
			for _, name := range a.Items {
				if _, ok := starNames[strings.TrimSpace(name)]; ok {
					failures = append(failures, fmt.Sprintf("star item %s must be single, not in carousel on %s", name, a.ScheduledDate))
				}
			}
		}
	}

	for _, a := range plan.Assignments {
		if _, ok := ctx.holidayByDate[a.ScheduledDate]; ok && normalizePostFormat(a.Format) == "carousel" {
			failures = append(failures, fmt.Sprintf("holiday %s must be single format", a.ScheduledDate))
		}
	}

	carouselsByWeek := map[int]int{}
	for _, a := range plan.Assignments {
		if normalizePostFormat(a.Format) != "carousel" {
			continue
		}
		wk := ctx.dateToWeek[a.ScheduledDate]
		carouselsByWeek[wk]++
	}
	for wk, c := range carouselsByWeek {
		if c > 2 {
			failures = append(failures, fmt.Sprintf("week %d has %d carousel(s) (max 2)", wk, c))
		}
	}

	for _, a := range plan.Assignments {
		if normalizePostFormat(a.Format) != "carousel" {
			continue
		}
		n := len(a.Items)
		if n < 2 || n > 4 {
			failures = append(failures, fmt.Sprintf("carousel on %s must have 2–4 items, got %d", a.ScheduledDate, n))
		}
		if a.CarouselNarrative == nil || strings.TrimSpace(*a.CarouselNarrative) == "" {
			failures = append(failures, fmt.Sprintf("carousel on %s missing carousel_narrative", a.ScheduledDate))
		}
	}

	for _, a := range plan.Assignments {
		if normalizePostFormat(a.Format) == "single" && len(a.Items) != 1 {
			failures = append(failures, fmt.Sprintf("single post on %s must have exactly one item", a.ScheduledDate))
		}
	}

	return failures
}
