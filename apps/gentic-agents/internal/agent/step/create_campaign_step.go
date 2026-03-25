package step

import (
	"github.com/daniel-dihardja/gentic/pkg/gentic"
)

// CreateCampaignStep is a static flow for the create_campaign intent (no LLM).
type CreateCampaignStep struct{}

// Run implements gentic.Step.
func (c CreateCampaignStep) Run(s *gentic.State) error {
	s.Output = "Ready to create the campaign"
	return nil
}
