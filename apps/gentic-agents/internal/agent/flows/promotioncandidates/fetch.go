package promotioncandidates

import (
	"context"
	"fmt"

	"github.com/daniel-dihardja/gentic-agents/internal/agent/flowstate"
	"github.com/daniel-dihardja/gentic-agents/internal/platform/graphql"
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
)

// FetchStep loads the full menu engineering matrix and menu heatmaps for analytics insights.
type FetchStep struct {
	GraphQLEndpoint string
}

// Run implements gen.Step.
// Loads missing pieces only: if matrix was hydrated from saved promotion candidates, only heatmaps are fetched.
func (s FetchStep) Run(ctx context.Context, state *gen.State) error {
	if flowstate.HasFetchedAnalyticsData(state) {
		return nil
	}

	locationID, analyticsID, err := flowstate.RequiredLocationIDs(state, "analytics insights")
	if err != nil {
		state.Output = err.Error()
		return nil
	}

	n := gen.NotifierFromContext(ctx)
	n.Notify("fetch_analytics", gen.ActivityRunning, "Load menu engineering matrix and heatmaps")

	_, hasMatrix := state.GetMetadata(flowstate.KeyAnalyticsMatrixItems)
	_, hasHeatmaps := state.GetMetadata(flowstate.KeyAnalyticsHeatmaps)

	if !hasMatrix {
		items, err := graphql.FetchMenuEngineeringMatrix(ctx, s.GraphQLEndpoint, analyticsID, nil)
		if err != nil {
			return fmt.Errorf("fetch menu engineering matrix: %w", err)
		}
		if items == nil {
			items = []graphql.MenuEngineeringItem{}
		}
		state.SetMetadata(flowstate.KeyAnalyticsMatrixItems, items)
	}
	if !hasHeatmaps {
		heatmaps, err := graphql.FetchMenuHeatmaps(ctx, s.GraphQLEndpoint, analyticsID, locationID)
		if err != nil {
			return fmt.Errorf("fetch menu heatmaps: %w", err)
		}
		state.SetMetadata(flowstate.KeyAnalyticsHeatmaps, heatmaps)
	}

	items, _ := flowstate.MatrixItemsFromMetadata(state)
	hms, _ := flowstate.HeatmapsFromMetadata(state)
	mi, mh := 0, 0
	if items != nil {
		mi = len(items)
	}
	if hms != nil {
		mh = len(hms)
	}
	n.Notify("fetch_analytics", gen.ActivityDone,
		fmt.Sprintf("%d matrix row(s), %d heatmap(s)", mi, mh))
	return nil
}
