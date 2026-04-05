package promotioncandidates

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"

	"github.com/daniel-dihardja/gentic-agents/internal/agent/flowstate"
	"github.com/daniel-dihardja/gentic-agents/internal/platform/graphql"
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
)

// FetchPromotionCandidatesInput has no parameters; campaign_id comes from request metadata.
type FetchPromotionCandidatesInput struct{}

// CreatePromotionCandidatesInput has no parameters; uses request metadata and analytics guards.
type CreatePromotionCandidatesInput struct{}

func fetchPromotionCandidatesHandler(endpoint string) func(context.Context, *gen.State, json.RawMessage) (json.RawMessage, error) {
	return func(ctx context.Context, state *gen.State, _ json.RawMessage) (json.RawMessage, error) {
		campaignID := strings.TrimSpace(flowstate.CampaignIDFromMetadata(state))
		if campaignID == "" {
			return json.Marshal(map[string]any{
				"error": "campaign_id is required in the request to load saved promotion candidates.",
			})
		}
		ctx = graphql.GraphQLContext(ctx, state)
		raw, ok, err := graphql.FetchPromotionCandidates(ctx, endpoint, campaignID)
		if err != nil {
			return nil, err
		}
		if !ok || len(raw) == 0 {
			return json.Marshal(map[string]any{"exists": false})
		}
		var payload promotionCandidatesPayload
		if err := json.Unmarshal(raw, &payload); err != nil {
			return nil, fmt.Errorf("promotion candidates JSON: %w", err)
		}
		state.SetMetadata(flowstate.KeyAnalyticsInsights, payload.Insights)
		state.SetMetadata(flowstate.KeyAnalyticsMatrixItems, payload.MatrixItems)
		state.Output = ""
		slog.Info("promotioncandidates tool: fetch_promotion_candidates ok",
			"component", "gentic-agents.promotioncandidates",
			"campaign_id", campaignID,
			"matrix_rows", len(payload.MatrixItems))
		return json.Marshal(map[string]any{
			"exists":                true,
			"stars_count":           len(payload.Insights.Stars),
			"plow_horses_count":     len(payload.Insights.PlowHorses),
			"puzzles_count":         len(payload.Insights.Puzzles),
			"day_patterns_weekdays": len(payload.Insights.DayPatterns),
			"matrix_rows":           len(payload.MatrixItems),
		})
	}
}

func createPromotionCandidatesHandler(model, endpoint string) func(context.Context, *gen.State, json.RawMessage) (json.RawMessage, error) {
	return func(ctx context.Context, state *gen.State, _ json.RawMessage) (json.RawMessage, error) {
		ctx = graphql.GraphQLContext(ctx, state)

		step := AnalyzeStep{Model: model}
		if err := step.Run(ctx, state); err != nil {
			return nil, err
		}

		insightsVal, ok := state.GetMetadata(flowstate.KeyAnalyticsInsights)
		if !ok {
			if msg := strings.TrimSpace(state.Output); msg != "" {
				state.Output = ""
				return json.Marshal(map[string]any{"error": msg})
			}
			return json.Marshal(map[string]any{"error": "Could not derive analytics insights."})
		}
		insights, ok := insightsVal.(flowstate.AnalyticsInsights)
		if !ok {
			state.Output = ""
			return json.Marshal(map[string]any{"error": "Invalid analytics insights in state."})
		}

		campaignID := strings.TrimSpace(flowstate.CampaignIDFromMetadata(state))
		if campaignID == "" {
			return nil, fmt.Errorf("campaign_id is required in the request to create and save promotion candidates")
		}

		items, ok := flowstate.MatrixItemsFromMetadata(state)
		if !ok {
			items = []graphql.MenuEngineeringItem{}
		}

		n := gen.NotifierFromContext(ctx)
		if n != nil {
			n.Notify("create_promotion_candidates", gen.ActivityRunning, "Save promotion candidates")
		}

		payload := promotionCandidatesPayload{
			Insights:    insights,
			MatrixItems: items,
		}
		if err := graphql.SavePromotionCandidates(ctx, endpoint, campaignID, payload); err != nil {
			return nil, fmt.Errorf("save promotion candidates: %w", err)
		}

		if n != nil {
			n.Notify("create_promotion_candidates", gen.ActivityDone, "Promotion candidates saved")
		}

		state.Output = ""
		slog.Info("promotioncandidates tool: create_promotion_candidates ok",
			"component", "gentic-agents.promotioncandidates",
			"campaign_id", campaignID,
			"stars", len(insights.Stars), "plow_horses", len(insights.PlowHorses), "puzzles", len(insights.Puzzles))

		return json.Marshal(map[string]any{
			"created":               true,
			"saved":                 true,
			"campaign_id":           campaignID,
			"stars_count":           len(insights.Stars),
			"plow_horses_count":     len(insights.PlowHorses),
			"puzzles_count":         len(insights.Puzzles),
			"day_patterns_weekdays": len(insights.DayPatterns),
			"matrix_rows":           len(items),
		})
	}
}
