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

	items, err := graphql.FetchMenuEngineeringMatrix(ctx, s.GraphQLEndpoint, analyticsID, nil)
	if err != nil {
		return fmt.Errorf("fetch menu engineering matrix: %w", err)
	}
	if items == nil {
		items = []graphql.MenuEngineeringItem{}
	}

	heatmaps, err := graphql.FetchMenuHeatmaps(ctx, s.GraphQLEndpoint, analyticsID, locationID)
	if err != nil {
		return fmt.Errorf("fetch menu heatmaps: %w", err)
	}

	state.SetMetadata(flowstate.KeyAnalyticsMatrixItems, items)
	state.SetMetadata(flowstate.KeyAnalyticsHeatmaps, heatmaps)

	n.Notify("fetch_analytics", gen.ActivityDone,
		fmt.Sprintf("%d matrix row(s), %d heatmap(s)", len(items), len(heatmaps)))
	return nil
}
