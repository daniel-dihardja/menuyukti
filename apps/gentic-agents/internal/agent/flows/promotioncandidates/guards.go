package promotioncandidates

import (
	"context"
	"fmt"
	"strings"

	"github.com/daniel-dihardja/gentic-agents/internal/agent/flowstate"
	"github.com/daniel-dihardja/gentic-agents/internal/platform/graphql"
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
	"github.com/daniel-dihardja/gentic/pkg/gentic/react"
)

// EnsureAnalyticsInput loads menu engineering matrix and heatmaps when either is missing (e.g. after
// loading saved promotion candidates from the DB, only matrix may be present until heatmaps are fetched).
func EnsureAnalyticsInput(endpoint string) react.GuardFunc {
	return func(ctx context.Context, state *gen.State) error {
		if flowstate.HasFetchedAnalyticsData(state) {
			return nil
		}
		ctx = graphql.GraphQLContext(ctx, state)
		step := FetchStep{GraphQLEndpoint: endpoint}
		if err := step.Run(ctx, state); err != nil {
			return err
		}
		if msg := strings.TrimSpace(state.Output); msg != "" {
			state.Output = ""
			return fmt.Errorf("%s", msg)
		}
		return nil
	}
}

// EnsureCampaignBrief loads the saved campaign brief into state when missing so
// create_promotion_candidates can align analytics with campaign strategy.
func EnsureCampaignBrief(endpoint string) react.GuardFunc {
	return func(ctx context.Context, state *gen.State) error {
		if flowstate.HasValidPersistedCampaignBrief(state) {
			return nil
		}
		campaignID := flowstate.CampaignIDFromMetadata(state)
		if campaignID == "" {
			return nil
		}
		ctx = graphql.GraphQLContext(ctx, state)
		brief, err := graphql.FetchCampaignBrief(ctx, endpoint, campaignID)
		if err != nil {
			return nil
		}
		if brief == nil || strings.TrimSpace(brief.CampaignTheme) == "" {
			state.DeleteMetadata(flowstate.KeyCampaignBrief)
			return nil
		}
		state.SetMetadata(flowstate.KeyCampaignBrief, brief)
		return nil
	}
}
