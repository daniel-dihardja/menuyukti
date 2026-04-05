package promotioncandidates

import (
	"context"
	"fmt"
	"strings"

	"github.com/daniel-dihardja/gentic-agents/internal/agent/flowstate"
	"github.com/daniel-dihardja/gentic-agents/internal/platform/graphql"
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
)

// promotionCandidatesPayload is the JSON stored on the campaign (insights + source matrix rows).
type promotionCandidatesPayload struct {
	Insights    flowstate.AnalyticsInsights   `json:"insights"`
	MatrixItems []graphql.MenuEngineeringItem `json:"matrix_items"`
}

// SavePromotionCandidatesStep persists analytics insights and matrix rows via savePromotionCandidates when campaign_id is set.
type SavePromotionCandidatesStep struct {
	GraphQLEndpoint string
}

// Run implements gen.Step.
func (s SavePromotionCandidatesStep) Run(ctx context.Context, state *gen.State) error {
	campaignID := strings.TrimSpace(flowstate.CampaignIDFromMetadata(state))
	if campaignID == "" {
		n := gen.NotifierFromContext(ctx)
		n.Notify("save_promotion_candidates", gen.ActivityDone, "Skipped (no campaign_id)")
		if state.Output != "" {
			state.Output += "\n\nPromotion candidates were not saved (campaign_id is required in the request)."
		} else {
			state.Output = "Promotion candidates were not saved (campaign_id is required in the request)."
		}
		return nil
	}

	insightsVal, ok := state.GetMetadata(flowstate.KeyAnalyticsInsights)
	if !ok {
		return nil
	}
	insights, ok := insightsVal.(flowstate.AnalyticsInsights)
	if !ok {
		return nil
	}

	items, ok := flowstate.MatrixItemsFromMetadata(state)
	if !ok {
		items = []graphql.MenuEngineeringItem{}
	}

	n := gen.NotifierFromContext(ctx)
	n.Notify("save_promotion_candidates", gen.ActivityRunning, "Save promotion candidates")

	payload := promotionCandidatesPayload{
		Insights:    insights,
		MatrixItems: items,
	}
	if err := graphql.SavePromotionCandidates(ctx, s.GraphQLEndpoint, campaignID, payload); err != nil {
		return fmt.Errorf("save promotion candidates: %w", err)
	}

	n.Notify("save_promotion_candidates", gen.ActivityDone, "Promotion candidates saved")
	if state.Output != "" {
		state.Output += "\n\nPromotion candidates saved for this campaign."
	} else {
		state.Output = "Promotion candidates saved for this campaign."
	}
	return nil
}
