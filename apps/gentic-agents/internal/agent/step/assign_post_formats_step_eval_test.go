package step_test

import (
	"context"
	"testing"

	"github.com/daniel-dihardja/gentic-agents/internal/agent/step"
	"github.com/daniel-dihardja/gentic-agents/internal/platform/graphql"
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
	ge "github.com/daniel-dihardja/gentic/pkg/gentic/eval"
)

func assignSelectedItems() []graphql.MenuEngineeringItem {
	return []graphql.MenuEngineeringItem{
		{Menu: "Ice Americano", Category: "star"},
		{Menu: "Cappuccino", Category: "star"},
		{Menu: "Choipan", Category: "puzzle"},
		{Menu: "Roti Coklat", Category: "puzzle"},
	}
}

func baseAssignState() *gen.State {
	return &gen.State{
		Input: "run",
		Metadata: map[string]interface{}{
			"location_id":               "loc-1",
			"analytics_id":              "an-1",
			"_selected_promotion_items": assignSelectedItems(),
			"_post_schedule": &step.PostSchedule{
				Weeks: []step.WeekSelection{
					{
						WeekNumber: 1,
						SelectedDates: []string{
							"2026-04-01", "2026-04-02", "2026-04-03", "2026-04-04",
						},
					},
				},
			},
		},
	}
}

func TestStepHarness_AssignPostFormats_happyPath(t *testing.T) {
	t.Parallel()

	state := baseAssignState()
	mock := &ge.MockLLM{
		ChatFunc: func(context.Context, string, string, string) (string, error) {
			return `{
  "assignments": [
    {"scheduled_date":"2026-04-01","format":"single","items":["Ice Americano"]},
    {"scheduled_date":"2026-04-02","format":"single","items":["Cappuccino"]},
    {"scheduled_date":"2026-04-03","format":"single","items":["Choipan"]},
    {"scheduled_date":"2026-04-04","format":"single","items":["Roti Coklat"]}
  ]
}`, nil
		},
	}

	h := ge.StepHarness{
		Step: step.AssignPostFormatsStep{
			LLM:                     mock,
			MaxReflectionIterations: 0,
		},
	}

	res := h.Run(context.Background(), state,
		step.PostFormatPlanNotEmptyEval{},
		step.PostFormatConstraintsEval{},
	)
	if res.Err != nil {
		t.Fatalf("Run: %v", res.Err)
	}
	if !res.Pass {
		t.Fatalf("expected Pass, got EvalResults=%+v", res.EvalResults)
	}
}

func TestStepHarness_AssignPostFormats_idempotent(t *testing.T) {
	t.Parallel()

	plan := &step.PostFormatPlan{
		Assignments: []step.PostFormatAssignment{
			{ScheduledDate: "2026-04-01", Format: "single", Items: []string{"Ice Americano"}},
		},
	}
	state := baseAssignState()
	state.Metadata["_post_format_plan"] = plan

	mock := &ge.MockLLM{
		ChatFunc: func(context.Context, string, string, string) (string, error) {
			t.Fatal("LLM should not be called when post format plan already exists")
			return "", nil
		},
	}

	h := ge.StepHarness{
		Step: step.AssignPostFormatsStep{
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
	got, _ := state.GetMetadata("_post_format_plan")
	p, ok := got.(*step.PostFormatPlan)
	if !ok || len(p.Assignments) != 1 || p.Assignments[0].ScheduledDate != "2026-04-01" {
		t.Fatalf("expected plan unchanged, got %+v", got)
	}
}

func TestStepHarness_AssignPostFormats_repairPath(t *testing.T) {
	t.Parallel()

	state := baseAssignState()
	mock := &ge.MockLLM{
		ChatFunc: func(context.Context, string, string, string) (string, error) {
			// Star + puzzle in one carousel on a single date — repair reshapes and places spill on free dates.
			return `{
  "assignments": [
    {
      "scheduled_date": "2026-04-01",
      "format": "carousel",
      "items": ["Ice Americano", "Choipan"],
      "carousel_narrative": "mixed"
    }
  ]
}`, nil
		},
	}

	h := ge.StepHarness{
		Step: step.AssignPostFormatsStep{
			LLM:                     mock,
			MaxReflectionIterations: 0,
		},
	}

	res := h.Run(context.Background(), state,
		step.PostFormatPlanNotEmptyEval{},
		step.PostFormatConstraintsEval{},
	)
	if res.Err != nil {
		t.Fatalf("Run: %v", res.Err)
	}
	if !res.Pass {
		t.Fatalf("expected Pass, got EvalResults=%+v", res.EvalResults)
	}
}
