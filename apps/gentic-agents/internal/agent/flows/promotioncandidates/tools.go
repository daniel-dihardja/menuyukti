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

// FetchAnalyticsInput has no parameters; location and analytics IDs come from request metadata.
type FetchAnalyticsInput struct{}

// GenerateCandidatesInput has no parameters; uses matrix and heatmaps from state after fetch.
type GenerateCandidatesInput struct{}

// SaveCandidatesInput has no parameters; campaign_id and insights come from request metadata and state.
type SaveCandidatesInput struct{}

func fetchAnalyticsHandler(endpoint string) func(context.Context, *gen.State, json.RawMessage) (json.RawMessage, error) {
	return func(ctx context.Context, state *gen.State, _ json.RawMessage) (json.RawMessage, error) {
		ctx = graphql.GraphQLContext(ctx, state)

		if flowstate.HasFetchedAnalyticsData(state) {
			items, _ := flowstate.MatrixItemsFromMetadata(state)
			hms, _ := flowstate.HeatmapsFromMetadata(state)
			return json.Marshal(map[string]any{
				"skipped":     true,
				"matrix_rows": len(items),
				"heatmaps":    len(hms),
				"message":     "Analytics input data already loaded in this session.",
			})
		}

		step := FetchStep{GraphQLEndpoint: endpoint}
		if err := step.Run(ctx, state); err != nil {
			return nil, err
		}
		if msg := strings.TrimSpace(state.Output); msg != "" {
			state.Output = ""
			return json.Marshal(map[string]any{"error": msg})
		}

		items, _ := flowstate.MatrixItemsFromMetadata(state)
		hms, _ := flowstate.HeatmapsFromMetadata(state)
		slog.Info("promotioncandidates tool: fetch_analytics_data ok",
			"component", "gentic-agents.promotioncandidates",
			"matrix_rows", len(items), "heatmaps", len(hms))
		return json.Marshal(map[string]any{
			"matrix_rows": len(items),
			"heatmaps":    len(hms),
		})
	}
}

func generateCandidatesHandler(model string) func(context.Context, *gen.State, json.RawMessage) (json.RawMessage, error) {
	return func(ctx context.Context, state *gen.State, _ json.RawMessage) (json.RawMessage, error) {
		ctx = graphql.GraphQLContext(ctx, state)

		if !flowstate.HasFetchedAnalyticsData(state) {
			return json.Marshal(map[string]any{
				"error": "Load analytics input first by calling fetch_analytics_data.",
			})
		}

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

		state.Output = ""
		slog.Info("promotioncandidates tool: generate_promotion_candidates ok",
			"component", "gentic-agents.promotioncandidates",
			"stars", len(insights.Stars), "plow_horses", len(insights.PlowHorses), "puzzles", len(insights.Puzzles))

		return json.Marshal(map[string]any{
			"generated":             true,
			"stars_count":           len(insights.Stars),
			"plow_horses_count":     len(insights.PlowHorses),
			"puzzles_count":         len(insights.Puzzles),
			"day_patterns_weekdays": len(insights.DayPatterns),
		})
	}
}

func saveCandidatesHandler(endpoint string) func(context.Context, *gen.State, json.RawMessage) (json.RawMessage, error) {
	return func(ctx context.Context, state *gen.State, _ json.RawMessage) (json.RawMessage, error) {
		ctx = graphql.GraphQLContext(ctx, state)

		campaignID := strings.TrimSpace(flowstate.CampaignIDFromMetadata(state))
		if campaignID == "" {
			return json.Marshal(map[string]any{
				"saved":  false,
				"reason": "campaign_id is required in the request to save promotion candidates.",
			})
		}

		if _, ok := state.GetMetadata(flowstate.KeyAnalyticsInsights); !ok {
			return json.Marshal(map[string]any{
				"saved":  false,
				"reason": "No analytics insights in state; call generate_promotion_candidates first.",
			})
		}

		state.Output = ""
		step := SavePromotionCandidatesStep{GraphQLEndpoint: endpoint}
		if err := step.Run(ctx, state); err != nil {
			return nil, fmt.Errorf("save promotion candidates: %w", err)
		}
		state.Output = ""

		slog.Info("promotioncandidates tool: save_promotion_candidates ok",
			"component", "gentic-agents.promotioncandidates",
			"campaign_id", campaignID)

		return json.Marshal(map[string]any{
			"saved":       true,
			"campaign_id": campaignID,
		})
	}
}
