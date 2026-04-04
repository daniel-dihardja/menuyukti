package promotion

import (
	"context"
	"fmt"

	"github.com/daniel-dihardja/gentic-agents/internal/agent/flowstate"
	"github.com/daniel-dihardja/gentic-agents/internal/platform/graphql"
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
)

// FetchStep loads menu engineering matrix rows (star / plow_horse / puzzle) for promotion planning.
type FetchStep struct {
	GraphQLEndpoint string
}

// Run implements gen.Step.
func (s FetchStep) Run(ctx context.Context, state *gen.State) error {
	if flowstate.HasFetchedPromotionItems(state) {
		return nil
	}

	_, analyticsID, err := flowstate.RequiredLocationIDs(state, "fetch promotion items")
	if err != nil {
		return nil
	}

	n := gen.NotifierFromContext(ctx)
	n.Notify("fetch_promotion_items", gen.ActivityRunning, "Load menu promotion candidates")

	items, err := graphql.FetchMenuEngineeringMatrix(ctx, s.GraphQLEndpoint, analyticsID, flowstate.PromotionMatrixCategories)
	if err != nil {
		return fmt.Errorf("fetch promotion items: %w", err)
	}
	if items == nil {
		items = []graphql.MenuEngineeringItem{}
	}

	state.SetMetadata(flowstate.KeyPromotionItems, items)

	label := fmt.Sprintf("%d promotion candidate(s)", len(items))
	if len(items) == 0 {
		label = "No menu engineering data (check COGS / matrix)"
	}
	n.Notify("fetch_promotion_items", gen.ActivityDone, label)
	return nil
}
