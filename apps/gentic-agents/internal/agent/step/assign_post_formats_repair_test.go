package step

import (
	"strings"
	"testing"

	"github.com/daniel-dihardja/gentic-agents/internal/platform/graphql"
)

func TestRepairAssignmentCoverage_DedupesAndPlacesMissing(t *testing.T) {
	promotionDates := []string{"2026-04-01", "2026-04-02", "2026-04-03"}
	dateToWeek := map[string]int{
		"2026-04-01": 1,
		"2026-04-02": 1,
		"2026-04-03": 1,
	}
	selected := []graphql.MenuEngineeringItem{
		{Menu: "Ice Americano", Category: "star"},
		{Menu: "Cappuccino", Category: "star"},
		{Menu: "Choipan", Category: "puzzle"},
		{Menu: "Roti Coklat", Category: "puzzle"},
	}
	// LLM garbage: same stars repeated on every date, missing puzzle items entirely.
	plan := &PostFormatPlan{
		Assignments: []PostFormatAssignment{
			{ScheduledDate: "2026-04-01", Format: "single", Items: []string{"Ice Americano"}},
			{ScheduledDate: "2026-04-02", Format: "single", Items: []string{"Ice Americano", "Cappuccino"}},
			{ScheduledDate: "2026-04-03", Format: "carousel", Items: []string{"Ice Americano", "Cappuccino"}, CarouselNarrative: strPtr("x")},
		},
	}
	ctx := assignFormatContext{
		promotionDates: promotionDates,
		selectedItems:  selected,
		dateToWeek:     dateToWeek,
		holidayByDate:  map[string]struct{}{},
	}
	repairAssignmentCoverage(plan, ctx)
	failures := checkHardConstraints(plan, ctx)
	if len(failures) > 0 {
		t.Fatalf("expected constraints satisfied, got: %s", strings.Join(failures, "; "))
	}
	seen := map[string]int{}
	for _, a := range plan.Assignments {
		for _, n := range a.Items {
			seen[strings.TrimSpace(n)]++
		}
	}
	for _, it := range selected {
		n := strings.TrimSpace(it.Menu)
		if seen[n] != 1 {
			t.Fatalf("item %q count %d, want 1", n, seen[n])
		}
	}
}

func strPtr(s string) *string { return &s }
