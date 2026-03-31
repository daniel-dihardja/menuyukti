package flowstate

import (
	"strings"

	"github.com/daniel-dihardja/gentic-agents/internal/platform/graphql"
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
)

// CampaignIDFromMetadata returns campaign_id when the client sent it (for DB-backed flows).
// Empty string means session-only brief generation (no row to key on yet).
func CampaignIDFromMetadata(state *gen.State) string {
	if state == nil {
		return ""
	}
	meta := state.SecureMetadata()
	id, err := meta.GetID("campaign_id")
	if err != nil {
		return ""
	}
	return id
}

// CampaignBriefFromMetadata retrieves the campaign brief from state.
func CampaignBriefFromMetadata(state *gen.State) (*graphql.CampaignBrief, bool) {
	if state == nil {
		return nil, false
	}
	v, ok := state.GetMetadata(KeyCampaignBrief)
	if !ok {
		return nil, false
	}
	b, ok := v.(*graphql.CampaignBrief)
	if !ok || b == nil {
		return nil, false
	}
	return b, true
}

// HasValidPersistedCampaignBrief checks if a campaign brief with non-empty theme exists.
func HasValidPersistedCampaignBrief(state *gen.State) bool {
	if state == nil {
		return false
	}
	v, ok := state.GetMetadata(KeyCampaignBrief)
	if !ok {
		return false
	}
	b, ok := v.(*graphql.CampaignBrief)
	if !ok || b == nil {
		return false
	}
	return strings.TrimSpace(b.CampaignTheme) != ""
}
