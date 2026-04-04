package flowstate

import (
	"github.com/daniel-dihardja/gentic-agents/internal/platform/graphql"
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
)

// AnalyticsInsights is the structured output of the analytics flow (menu engineering + heatmaps → LLM).
type AnalyticsInsights struct {
	Stars       []string            `json:"stars"`
	PlowHorses  []string            `json:"plow_horses"`
	Puzzles     []string            `json:"puzzles"`
	DayPatterns map[string][]string `json:"day_patterns"`
}

// HasFetchedAnalyticsData reports whether matrix and heatmaps were loaded into state.
func HasFetchedAnalyticsData(state *gen.State) bool {
	if state == nil {
		return false
	}
	_, okM := state.GetMetadata(KeyAnalyticsMatrixItems)
	_, okH := state.GetMetadata(KeyAnalyticsHeatmaps)
	return okM && okH
}

// MatrixItemsFromMetadata returns menu engineering rows stored by the analytics fetch step.
func MatrixItemsFromMetadata(state *gen.State) ([]graphql.MenuEngineeringItem, bool) {
	if state == nil {
		return nil, false
	}
	v, ok := state.GetMetadata(KeyAnalyticsMatrixItems)
	if !ok {
		return nil, false
	}
	sl, ok := v.([]graphql.MenuEngineeringItem)
	if !ok {
		return nil, false
	}
	return sl, true
}

// HeatmapsFromMetadata returns heatmap rows stored by the analytics fetch step.
func HeatmapsFromMetadata(state *gen.State) ([]graphql.MenuHeatmap, bool) {
	if state == nil {
		return nil, false
	}
	v, ok := state.GetMetadata(KeyAnalyticsHeatmaps)
	if !ok {
		return nil, false
	}
	sl, ok := v.([]graphql.MenuHeatmap)
	if !ok {
		return nil, false
	}
	return sl, true
}
