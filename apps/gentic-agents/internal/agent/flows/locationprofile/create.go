package locationprofile

import (
	"context"
	"strings"
	"time"

	"github.com/daniel-dihardja/gentic-agents/internal/agent/flowstate"
	"github.com/daniel-dihardja/gentic-agents/internal/agent/planning"
	"github.com/daniel-dihardja/gentic-agents/internal/platform/graphql"
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
	"github.com/daniel-dihardja/gentic/pkg/gentic/reflect"
	"github.com/daniel-dihardja/gentic/pkg/providers/openai"
)

// LocationDataLoader loads venue + operating data for CreateStep. When nil, graphql.FetchLocationData is used.
type LocationDataLoader interface {
	FetchLocationData(ctx context.Context, endpoint, locationID, analyticsID string) (*graphql.Location, *graphql.OperatingProfile, error)
}

// ProfileSaver persists a location profile summary. When nil, graphql.SaveLocationProfile is used.
type ProfileSaver interface {
	SaveLocationProfile(ctx context.Context, endpoint, locationID, analyticsID, summary string) (savedID string, err error)
}

// CreateStep generates and persists a location profile when none exists (after CheckStep).
type CreateStep struct {
	GraphQLEndpoint         string
	Model                   string
	MaxReflectionIterations int
	DataLoader              LocationDataLoader
	Saver                   ProfileSaver
	LLM                     gen.LLM
	ReloadProfile           ProfileLoader
}

func (s CreateStep) reloadProfile(ctx context.Context, endpoint, locationID, analyticsID string) (*graphql.LocationProfile, error) {
	if s.ReloadProfile != nil {
		return s.ReloadProfile.Load(ctx, endpoint, locationID, analyticsID)
	}
	return graphql.FetchLocationProfile(ctx, endpoint, locationID, analyticsID)
}

// Run implements gen.Step.
func (s CreateStep) Run(ctx context.Context, state *gen.State) (err error) {
	if flowstate.HasValidPersistedLocationProfile(state) {
		return nil
	}

	locationID, analyticsID, err := flowstate.RequiredLocationIDs(state, "create location profile")
	if err != nil {
		state.Output = err.Error()
		return nil
	}

	ctx, cancel := context.WithTimeout(ctx, 5*time.Minute)
	defer cancel()

	n := gen.NotifierFromContext(ctx)
	n.Notify("create_location_profile", gen.ActivityRunning, "Create a location profile")

	var loc *graphql.Location
	var op *graphql.OperatingProfile
	if s.DataLoader != nil {
		loc, op, err = s.DataLoader.FetchLocationData(ctx, s.GraphQLEndpoint, locationID, analyticsID)
	} else {
		loc, op, err = graphql.FetchLocationData(ctx, s.GraphQLEndpoint, locationID, analyticsID)
	}
	if err != nil {
		return err
	}
	if loc == nil || strings.TrimSpace(loc.Name) == "" {
		state.Output = "Cannot create location profile: location data could not be loaded."
		n.Notify("create_location_profile", gen.ActivityDone, "Could not load location data")
		return nil
	}

	llm := s.LLM
	if llm == nil {
		llm = openai.Provider{}
	}
	model := s.Model
	if model == "" {
		model = openai.DefaultModel
	}

	saveProfile := func(ctx context.Context, endpoint, lid, aid, summary string) error {
		if s.Saver != nil {
			_, err := s.Saver.SaveLocationProfile(ctx, endpoint, lid, aid, summary)
			return err
		}
		_, err := graphql.SaveLocationProfile(ctx, endpoint, lid, aid, summary)
		return err
	}

	var summary string

	if op != nil {
		n.Notify("create_location_profile", gen.ActivityDone, "Create a location profile")

		genPrompt := buildOperatingDataLocationSummaryPrompt(loc, op)
		refSnap := buildReflectionSnapshot(loc, op)
		summary, err = reflect.RunReflectLoop(ctx, reflect.ReflectLoopParams{
			LLM:                    llm,
			Model:                  model,
			MaxIterations:          s.MaxReflectionIterations,
			GenerationSystemPrompt: generationSystemPrompt,
			ReflectionSystemPrompt: reflectionSystemPrefix,
			GenerationPrompt:       genPrompt,
			BuildReflectionUser: func(draft string) string {
				return buildReflectionUser(refSnap, draft)
			},
			BuildRevisionPrompt: buildRestaurantLocationRevisionPrompt,
			OnIteration: planning.NotifyRefiningIteration("profile_refinement"),
		})
		if err != nil {
			return err
		}
		n.Notify("profile_refinement", gen.ActivityDone, "Profile refined")
	} else {
		summary, err = llm.Chat(ctx, model, generationSystemPrompt, buildInferenceOnlyLocationSummaryPrompt(loc))
		if err != nil {
			return err
		}
		n.Notify("create_location_profile", gen.ActivityDone, "Create a location profile")
	}

	if err := saveProfile(ctx, s.GraphQLEndpoint, locationID, analyticsID, summary); err != nil {
		return err
	}

	// So downstream steps (e.g. campaign brief) see the same metadata as after CheckStep.
	profileRow, err := s.reloadProfile(ctx, s.GraphQLEndpoint, locationID, analyticsID)
	if err != nil {
		return err
	}
	if profileRow != nil {
		state.SetMetadata(flowstate.KeyLocationProfile, profileRow)
	} else {
		state.SetMetadata(flowstate.KeyLocationProfile, &graphql.LocationProfile{Summary: summary})
	}

	// Short, deterministic copy — full profile is streamed to the artifact; avoid a second LLM turn
	// that could add long recap text to state.Output (e.g. campaign pipeline).
	notify := fallbackProfileCreatedMessage(loc)

	// Emit planning progress (SSE data-location-profile) for artifact panel
	n.Notify("location_profile_saved", gen.ActivityDone, "Location profile saved", gen.WithDetail(loc.Name))
	planning.EmitPlanningProgress(ctx, state)
	// Set output to the confirmation message so the LLM responds to the user
	state.Output = notify
	return nil
}
