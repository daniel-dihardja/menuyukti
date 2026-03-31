package step

// This file is deprecated. Use github.com/daniel-dihardja/gentic-agents/internal/agent/flowstate instead.
// Keeping function aliases for backward compatibility during migration.

import (
	fs "github.com/daniel-dihardja/gentic-agents/internal/agent/flowstate"
	"github.com/daniel-dihardja/gentic-agents/internal/platform/graphql"
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
)

// Deprecated: use flowstate.CampaignIDFromMetadata
func campaignIDFromMetadata(state *gen.State) string {
	return fs.CampaignIDFromMetadata(state)
}

// Deprecated: use flowstate.HasValidPersistedCampaignBrief
func hasValidPersistedCampaignBrief(state *gen.State) bool {
	return fs.HasValidPersistedCampaignBrief(state)
}

// Deprecated: use flowstate.CampaignBriefFromMetadata
func CampaignBriefFromMetadata(state *gen.State) (*graphql.CampaignBrief, bool) {
	return fs.CampaignBriefFromMetadata(state)
}
