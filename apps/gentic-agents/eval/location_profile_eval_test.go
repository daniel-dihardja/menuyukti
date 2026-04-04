package eval_test

import (
	"context"
	"strings"
	"testing"

	"github.com/daniel-dihardja/gentic-agents/internal/agent/flowstate"
	"github.com/daniel-dihardja/gentic-agents/internal/agent/flows/locationprofile"
	"github.com/daniel-dihardja/gentic-agents/internal/platform/graphql"
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
	ge "github.com/daniel-dihardja/gentic/pkg/gentic/eval"
)

type stubProfileLoader struct {
	fn func(ctx context.Context, endpoint, locationID, analyticsID string) (*graphql.LocationProfile, error)
}

func (s stubProfileLoader) Load(ctx context.Context, endpoint, locationID, analyticsID string) (*graphql.LocationProfile, error) {
	return s.fn(ctx, endpoint, locationID, analyticsID)
}

type stubLocationDataLoader struct {
	fn func(ctx context.Context, endpoint, locationID, analyticsID string) (*graphql.Location, *graphql.OperatingProfile, error)
}

func (s stubLocationDataLoader) FetchLocationData(ctx context.Context, endpoint, locationID, analyticsID string) (*graphql.Location, *graphql.OperatingProfile, error) {
	return s.fn(ctx, endpoint, locationID, analyticsID)
}

type stubProfileSaver struct {
	Saves int
}

func (s *stubProfileSaver) SaveLocationProfile(ctx context.Context, endpoint, locationID, analyticsID, summary string) (string, error) {
	s.Saves++
	return "stub-profile-id", nil
}

func profilePipelineLLM() *ge.MockLLM {
	return &ge.MockLLM{
		ChatFunc: func(ctx context.Context, model, system, user string) (string, error) {
			if strings.Contains(system, "helpful assistant") || strings.Contains(system, "Write 2–4") {
				return "Your marketing profile is ready.", nil
			}
			return "**Venue Identity**\nLine one.\n\n**Audience Persona**\nLine two.\n\n**Traffic & Timing**\nLine three.\n\n**Content & Tone Signals**\nLine four.\n", nil
		},
	}
}

func operatingProfileFixture() *graphql.OperatingProfile {
	return &graphql.OperatingProfile{
		TotalOrders:       10,
		TotalRevenue:      100,
		ActiveDaysCount:   5,
		AvgDailyOrders:    2,
		AvgOrderSize:      1.5,
		WeekdayShare:      0.6,
		WeekendShare:      0.4,
		PeakDay:           "Friday",
		PrimaryMealPeriod: "dinner",
		OperatingPattern:  "steady",
		DiningFocus:       "food",
	}
}

func meta(loc, analytics string) map[string]interface{} {
	return map[string]interface{}{
		"location_id":   loc,
		"analytics_id":  analytics,
	}
}

// stubReloadProfile avoids HTTP after save in [locationprofile.CreateStep] (reload row).
func stubReloadProfile() stubProfileLoader {
	return stubProfileLoader{
		fn: func(ctx context.Context, endpoint, locationID, analyticsID string) (*graphql.LocationProfile, error) {
			return &graphql.LocationProfile{ID: "lp-stub", Summary: "stub"}, nil
		},
	}
}

func TestEvalSuite_LocationProfile(t *testing.T) {
	t.Parallel()

	t.Run("profile_exists_skips_create", func(t *testing.T) {
		t.Parallel()
		loader := stubProfileLoader{
			fn: func(ctx context.Context, endpoint, locationID, analyticsID string) (*graphql.LocationProfile, error) {
				return &graphql.LocationProfile{ID: "lp1", Summary: "already saved"}, nil
			},
		}
		agent := gen.Agent{
			Resolver: fixedFlowResolver{f: gen.NewFlow(
				ge.WrapWithEval("check_location_profile", locationprofile.CheckStep{Loader: loader, GraphQLEndpoint: "http://unused"}),
				gen.If(flowstate.NeedsLocationProfileCreation, ge.WrapWithEval("create_location_profile", locationprofile.CreateStep{
					GraphQLEndpoint: "http://unused",
					LLM:             ge.ReplyChat("should-not-run", nil),
				})),
			)},
		}
		runner := ge.Runner{Agent: agent}
		res := runner.Run(context.Background(), ge.Suite{
			Name: "location_profile",
			Cases: []ge.Case{{
				Name:  "existing_profile",
				Input: gen.AgentInput{Query: "run", Metadata: meta("1", "2")},
				Scorers: []ge.Scorer{
					ge.NoError{},
					ge.OutputContains{Substr: "already saved"},
				},
			}},
		})
		if len(res) != 1 || !res[0].Pass {
			t.Fatalf("expected pass, got %+v trace=%+v", res, res[0].Trace)
		}
		if len(res[0].Trace.Steps) < 1 {
			t.Fatalf("expected step trace, got %+v", res[0].Trace.Steps)
		}
	})

	t.Run("missing_location_ids", func(t *testing.T) {
		t.Parallel()
		agent := gen.Agent{
			Resolver: fixedFlowResolver{f: gen.NewFlow(
				ge.WrapWithEval("check_location_profile", locationprofile.CheckStep{GraphQLEndpoint: "http://unused"}),
			)},
		}
		runner := ge.Runner{Agent: agent}
		res := runner.Run(context.Background(), ge.Suite{
			Name: "location_profile",
			Cases: []ge.Case{{
				Name:  "missing_ids",
				Input: gen.AgentInput{Query: "run", Metadata: map[string]interface{}{}},
				Scorers: []ge.Scorer{
					ge.NoError{},
					ge.OutputContains{Substr: "location_id"},
				},
			}},
		})
		if len(res) != 1 || !res[0].Pass {
			t.Fatalf("expected pass, got %+v", res)
		}
	})

	t.Run("create_inference_only", func(t *testing.T) {
		t.Parallel()
		checkLoader := stubProfileLoader{
			fn: func(ctx context.Context, endpoint, locationID, analyticsID string) (*graphql.LocationProfile, error) {
				return nil, nil
			},
		}
		dataLoader := stubLocationDataLoader{
			fn: func(ctx context.Context, endpoint, locationID, analyticsID string) (*graphql.Location, *graphql.OperatingProfile, error) {
				return &graphql.Location{
					ID:      graphql.ID("loc1"),
					Name:    "Test Cafe",
					City:    "Berlin",
					Country: "DE",
				}, nil, nil
			},
		}
		saver := &stubProfileSaver{}
		agent := gen.Agent{
			Resolver: fixedFlowResolver{f: gen.NewFlow(
				ge.WrapWithEval("check_location_profile", locationprofile.CheckStep{Loader: checkLoader, GraphQLEndpoint: "http://unused"}),
				gen.If(flowstate.NeedsLocationProfileCreation, ge.WrapWithEval("create_location_profile", locationprofile.CreateStep{
					GraphQLEndpoint:         "http://unused",
					DataLoader:              dataLoader,
					Saver:                   saver,
					ReloadProfile:           stubReloadProfile(),
					LLM:                     profilePipelineLLM(),
					MaxReflectionIterations: 0,
				})),
			)},
		}
		runner := ge.Runner{Agent: agent}
		res := runner.Run(context.Background(), ge.Suite{
			Name: "location_profile",
			Cases: []ge.Case{{
				Name:  "inference_only",
				Input: gen.AgentInput{Query: "run", Metadata: meta("9", "8")},
				Scorers: []ge.Scorer{
					ge.NoError{},
					ge.OutputContains{Substr: "created and saved"},
					ge.OutputContains{Substr: "Location profile"},
				},
			}},
		})
		if len(res) != 1 || !res[0].Pass {
			t.Fatalf("expected pass, got %+v trace=%+v scores=%+v", res, res[0].Trace, res[0].Scores)
		}
		if saver.Saves < 1 {
			t.Fatalf("expected at least one save, got %d", saver.Saves)
		}
	})

	t.Run("create_with_operating_data_reflect_loop", func(t *testing.T) {
		t.Parallel()
		checkLoader := stubProfileLoader{
			fn: func(ctx context.Context, endpoint, locationID, analyticsID string) (*graphql.LocationProfile, error) {
				return nil, nil
			},
		}
		op := operatingProfileFixture()
		dataLoader := stubLocationDataLoader{
			fn: func(ctx context.Context, endpoint, locationID, analyticsID string) (*graphql.Location, *graphql.OperatingProfile, error) {
				return &graphql.Location{
					ID:      graphql.ID("loc2"),
					Name:    "Ops Bistro",
					City:    "Paris",
					Country: "FR",
				}, op, nil
			},
		}
		saver := &stubProfileSaver{}
		agent := gen.Agent{
			Resolver: fixedFlowResolver{f: gen.NewFlow(
				ge.WrapWithEval("check_location_profile", locationprofile.CheckStep{Loader: checkLoader, GraphQLEndpoint: "http://unused"}),
				gen.If(flowstate.NeedsLocationProfileCreation, ge.WrapWithEval("create_location_profile", locationprofile.CreateStep{
					GraphQLEndpoint:         "http://unused",
					DataLoader:              dataLoader,
					Saver:                   saver,
					ReloadProfile:           stubReloadProfile(),
					LLM:                     profilePipelineLLM(),
					MaxReflectionIterations: 0,
				})),
			)},
		}
		runner := ge.Runner{Agent: agent}
		res := runner.Run(context.Background(), ge.Suite{
			Name: "location_profile",
			Cases: []ge.Case{{
				Name:  "operating_data",
				Input: gen.AgentInput{Query: "run", Metadata: meta("3", "4")},
				Scorers: []ge.Scorer{
					ge.NoError{},
					ge.OutputContains{Substr: "created and saved"},
					ge.OutputContains{Substr: "Location profile"},
				},
			}},
		})
		if len(res) != 1 || !res[0].Pass {
			t.Fatalf("expected pass, got %+v trace=%+v scores=%+v", res, res[0].Trace, res[0].Scores)
		}
		if saver.Saves < 1 {
			t.Fatalf("expected at least one save, got %d", saver.Saves)
		}
	})
}

// fixedFlowResolver returns the same flow and does not perform intent routing.
type fixedFlowResolver struct {
	f gen.Flow
}

func (f fixedFlowResolver) Resolve(ctx context.Context, s *gen.State) gen.Flow {
	return f.f
}
