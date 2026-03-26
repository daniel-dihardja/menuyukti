package step

import (
	"strings"

	"github.com/daniel-dihardja/gentic-agents/internal/platform/graphql"
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
)

const metadataKeyCampaignBrief = "_campaign_brief"

// campaignIDFromMetadata returns campaign_id when the client sent it (for DB-backed flows).
// Empty string means session-only brief generation (no row to key on yet).
func campaignIDFromMetadata(state *gen.State) string {
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

func hasValidPersistedCampaignBrief(state *gen.State) bool {
	if state == nil {
		return false
	}
	v, ok := state.GetMetadata(metadataKeyCampaignBrief)
	if !ok {
		return false
	}
	b, ok := v.(*graphql.CampaignBrief)
	if !ok || b == nil {
		return false
	}
	return strings.TrimSpace(b.CampaignTheme) != ""
}
