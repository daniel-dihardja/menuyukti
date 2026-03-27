package step

import (
	"context"
	"fmt"
	"strings"

	"github.com/daniel-dihardja/gentic-agents/internal/platform/graphql"
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
	ge "github.com/daniel-dihardja/gentic/pkg/gentic/eval"
)

// SelectedItemsNotEmptyEval passes when _selected_promotion_items is a non-empty slice.
type SelectedItemsNotEmptyEval struct{}

func (SelectedItemsNotEmptyEval) Evaluate(ctx context.Context, s *gen.State) ge.EvalResult {
	return ge.MetadataSliceNotEmpty{Key: metadataKeySelectedPromotionItems, Name: "selected_items_not_empty"}.Evaluate(ctx, s)
}

// SelectedItemsBCGMixEval checks approximate BCG distribution: star ≈60–70%, puzzle ≈20–30%, plow_horse ≤10%.
type SelectedItemsBCGMixEval struct{}

func (SelectedItemsBCGMixEval) Evaluate(_ context.Context, s *gen.State) ge.EvalResult {
	const name = "selected_items_bcg_mix"
	if s == nil {
		return ge.EvalResult{Name: name, Pass: false, Reason: "nil state"}
	}
	v, ok := s.GetMetadata(metadataKeySelectedPromotionItems)
	if !ok || v == nil {
		return ge.EvalResult{Name: name, Pass: false, Reason: "missing selected promotion items"}
	}
	items, ok := v.([]graphql.MenuEngineeringItem)
	if !ok {
		return ge.EvalResult{Name: name, Pass: false, Reason: "selected promotion items wrong type"}
	}
	if len(items) == 0 {
		return ge.EvalResult{Name: name, Pass: false, Reason: "empty selection"}
	}
	if ok, reason := bcgMixOK(items); !ok {
		return ge.EvalResult{Name: name, Pass: false, Reason: reason}
	}
	return ge.EvalResult{Name: name, Pass: true, Score: 1}
}

func bcgMixOK(items []graphql.MenuEngineeringItem) (bool, string) {
	n := len(items)
	var star, puzzle, plow int
	for _, it := range items {
		c := strings.ToLower(strings.TrimSpace(it.Category))
		switch c {
		case "star":
			star++
		case "puzzle":
			puzzle++
		case "plow_horse":
			plow++
		}
	}
	if star+puzzle+plow != n {
		return false, fmt.Sprintf("unexpected categories: want only star/puzzle/plow_horse, got %d categorized / %d items", star+puzzle+plow, n)
	}
	sf := float64(star) / float64(n)
	pf := float64(puzzle) / float64(n)
	plf := float64(plow) / float64(n)
	// Relaxed bands around target mix (60–70 / 20–30 / ≤10). Upper puzzle bound allows ensureNonStarCarouselCandidates side effects.
	if sf < 0.50 || sf > 0.78 {
		return false, fmt.Sprintf("star share %.2f outside ~0.60–0.70 (tolerant 0.50–0.78)", sf)
	}
	if pf < 0.10 || pf > 0.52 {
		return false, fmt.Sprintf("puzzle share %.2f outside ~0.20–0.30 (tolerant 0.10–0.52)", pf)
	}
	if plf > 0.13 {
		return false, fmt.Sprintf("plow_horse share %.2f exceeds ~0.10 (max 0.13)", plf)
	}
	return true, ""
}

// PostFormatPlanNotEmptyEval passes when _post_format_plan exists with at least one assignment.
type PostFormatPlanNotEmptyEval struct{}

func (PostFormatPlanNotEmptyEval) Evaluate(_ context.Context, s *gen.State) ge.EvalResult {
	const name = "post_format_plan_not_empty"
	if s == nil {
		return ge.EvalResult{Name: name, Pass: false, Reason: "nil state"}
	}
	p, ok := postFormatPlanFromMetadata(s)
	if !ok || p == nil {
		return ge.EvalResult{Name: name, Pass: false, Reason: "missing post format plan"}
	}
	if len(p.Assignments) == 0 {
		return ge.EvalResult{Name: name, Pass: false, Reason: "no assignments"}
	}
	return ge.EvalResult{Name: name, Pass: true, Score: 1}
}

// PostFormatConstraintsEval runs checkHardConstraints on the plan using schedule, selection, and holidays from state.
type PostFormatConstraintsEval struct{}

func (PostFormatConstraintsEval) Evaluate(_ context.Context, s *gen.State) ge.EvalResult {
	const name = "post_format_constraints"
	if s == nil {
		return ge.EvalResult{Name: name, Pass: false, Reason: "nil state"}
	}
	plan, ok := postFormatPlanFromMetadata(s)
	if !ok || plan == nil {
		return ge.EvalResult{Name: name, Pass: false, Reason: "missing post format plan"}
	}
	selected, ok := selectedPromotionItemsFromMetadata(s)
	if !ok {
		return ge.EvalResult{Name: name, Pass: false, Reason: "missing selected promotion items"}
	}
	ps, ok := postScheduleFromMetadata(s)
	if !ok || ps == nil {
		return ge.EvalResult{Name: name, Pass: false, Reason: "missing post schedule"}
	}
	promotionDates := distinctSortedDates(ps)
	if len(promotionDates) == 0 {
		return ge.EvalResult{Name: name, Pass: false, Reason: "no promotion dates"}
	}
	meta := s.SecureMetadata()
	holidayByDate := holidayDatesByDate(meta.GetString("national_holidays"))
	ctx := assignFormatContext{
		promotionDates: promotionDates,
		selectedItems:  selected,
		dateToWeek:     dateToWeekNumber(ps),
		holidayByDate:  holidayByDate,
	}
	failures := checkHardConstraints(plan, ctx)
	if len(failures) > 0 {
		return ge.EvalResult{Name: name, Pass: false, Reason: strings.Join(failures, "; ")}
	}
	return ge.EvalResult{Name: name, Pass: true, Score: 1}
}
