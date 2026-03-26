package step_test

import (
	"context"
	"testing"

	"github.com/daniel-dihardja/gentic-agents/internal/agent/step"
	"github.com/daniel-dihardja/gentic-agents/internal/platform/graphql"
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
	ge "github.com/daniel-dihardja/gentic/pkg/gentic/eval"
)

type harnessProfileLoader struct {
	profile *graphql.LocationProfile
}

func (h harnessProfileLoader) Load(ctx context.Context, endpoint, locationID, analyticsID string) (*graphql.LocationProfile, error) {
	return h.profile, nil
}

func TestStepHarness_CheckLocationProfile_metadataAndOutput(t *testing.T) {
	t.Parallel()

	state := &gen.State{
		Input: "run",
		Metadata: map[string]interface{}{
			"location_id":   "loc-1",
			"analytics_id": "an-1",
		},
	}

	h := ge.StepHarness{
		Step: step.CheckLocationProfileStep{
			GraphQLEndpoint: "http://unused",
			Loader: harnessProfileLoader{
				profile: &graphql.LocationProfile{ID: "lp1", Summary: "A cozy spot"},
			},
		},
	}

	res := h.Run(context.Background(), state,
		ge.MetadataKeyExists{Key: "_location_profile"},
		ge.OutputNotEmpty{},
	)
	if res.Err != nil {
		t.Fatalf("Run: %v", res.Err)
	}
	if !res.Pass {
		t.Fatalf("expected Pass, got EvalResults=%+v", res.EvalResults)
	}
}
