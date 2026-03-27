package step_test

import (
	"context"
	"testing"

	"github.com/daniel-dihardja/gentic-agents/internal/agent/step"
	"github.com/daniel-dihardja/gentic-agents/internal/platform/graphql"
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
	ge "github.com/daniel-dihardja/gentic/pkg/gentic/eval"
)

func promotionCandidates() []graphql.MenuEngineeringItem {
	return []graphql.MenuEngineeringItem{
		{Menu: "Ice Americano", Category: "star", WeValue: 10},
		{Menu: "Cappuccino", Category: "star", WeValue: 9},
		{Menu: "Espresso", Category: "star", WeValue: 8},
		{Menu: "Choipan", Category: "puzzle", WeValue: 5},
		{Menu: "Roti Coklat", Category: "puzzle", WeValue: 4},
	}
}

func baseSelectState() *gen.State {
	return &gen.State{
		Input: "run",
		Metadata: map[string]interface{}{
			"location_id":    "loc-1",
			"analytics_id":   "an-1",
			"_promotion_items": promotionCandidates(),
			"_campaign_brief": &graphql.CampaignBrief{
				CampaignTheme:  "Summer sips",
				Tone:           "Warm",
				TargetAudience: "Locals",
			},
			"_post_schedule": &step.PostSchedule{
				Weeks: []step.WeekSelection{
					{
						WeekNumber:    1,
						SelectedDates: []string{"2026-04-01", "2026-04-02", "2026-04-03", "2026-04-04", "2026-04-05"},
					},
				},
			},
		},
	}
}

func TestStepHarness_SelectPromotionItems_happyPath(t *testing.T) {
	t.Parallel()

	state := baseSelectState()
	mock := &ge.MockLLM{
		ChatFunc: func(context.Context, string, string, string) (string, error) {
			return `{"selected_menu_names": ["Ice Americano","Cappuccino","Espresso","Choipan","Roti Coklat"]}`, nil
		},
	}

	h := ge.StepHarness{
		Step: step.SelectPromotionItemsStep{
			LLM:                     mock,
			MaxReflectionIterations: 0,
		},
	}

	res := h.Run(context.Background(), state,
		step.SelectedItemsNotEmptyEval{},
		step.SelectedItemsBCGMixEval{},
	)
	if res.Err != nil {
		t.Fatalf("Run: %v", res.Err)
	}
	if !res.Pass {
		t.Fatalf("expected Pass, got EvalResults=%+v", res.EvalResults)
	}
}

func TestStepHarness_SelectPromotionItems_idempotent(t *testing.T) {
	t.Parallel()

	existing := []graphql.MenuEngineeringItem{
		{Menu: "Ice Americano", Category: "star"},
	}
	state := baseSelectState()
	state.Metadata["_selected_promotion_items"] = existing

	mock := &ge.MockLLM{
		ChatFunc: func(context.Context, string, string, string) (string, error) {
			t.Fatal("LLM should not be called when selection already exists")
			return "", nil
		},
	}

	h := ge.StepHarness{
		Step: step.SelectPromotionItemsStep{
			LLM:                     mock,
			MaxReflectionIterations: 0,
		},
	}

	res := h.Run(context.Background(), state)
	if res.Err != nil {
		t.Fatalf("Run: %v", res.Err)
	}
	if !res.Pass {
		t.Fatalf("expected Pass, got EvalResults=%+v", res.EvalResults)
	}
	got, _ := state.GetMetadata("_selected_promotion_items")
	sl, ok := got.([]graphql.MenuEngineeringItem)
	if !ok || len(sl) != 1 || sl[0].Menu != "Ice Americano" {
		t.Fatalf("expected selection unchanged, got %+v", got)
	}
}

func TestStepHarness_SelectPromotionItems_improveThenFix(t *testing.T) {
	t.Parallel()

	state := baseSelectState()
	n := 0
	mock := &ge.MockLLM{
		ChatFunc: func(_ context.Context, _, sys, _ string) (string, error) {
			n++
			switch n {
			case 1:
				// Stars only — reviewer should IMPROVE.
				return `{"selected_menu_names": ["Ice Americano","Cappuccino","Espresso"]}`, nil
			case 2:
				if sys == "" {
					t.Fatal("expected non-empty system prompt for reflection")
				}
				return "IMPROVE:\n- add at least two non-star items for carousel eligibility", nil
			case 3:
				// Revision: mixed BCG list (3 star + 2 puzzle).
				return `{"selected_menu_names": ["Ice Americano","Cappuccino","Espresso","Choipan","Roti Coklat"]}`, nil
			default:
				t.Fatalf("unexpected Chat call %d", n)
				panic("unreachable")
			}
		},
	}

	h := ge.StepHarness{
		Step: step.SelectPromotionItemsStep{
			LLM:                     mock,
			MaxReflectionIterations: 1,
		},
	}

	res := h.Run(context.Background(), state,
		step.SelectedItemsNotEmptyEval{},
		step.SelectedItemsBCGMixEval{},
	)
	if res.Err != nil {
		t.Fatalf("Run: %v", res.Err)
	}
	if !res.Pass {
		t.Fatalf("expected Pass, got EvalResults=%+v", res.EvalResults)
	}
	if n != 3 {
		t.Fatalf("expected 3 LLM calls, got %d", n)
	}
}
