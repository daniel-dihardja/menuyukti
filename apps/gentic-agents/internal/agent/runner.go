package agent

import (
	"context"

	"github.com/daniel-dihardja/gentic-agents/internal/api/dto"
	genticadapter "github.com/daniel-dihardja/gentic-agents/internal/gentic"
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
	"github.com/daniel-dihardja/gentic/pkg/providers/openai"
)

// Runner executes the Gentic agent with request-scoped metadata.
type Runner struct {
	agent gen.Agent
	sllm  gen.StreamingLLM
}

// NewRunner constructs a Runner with a shared agent and streaming provider.
func NewRunner(model, systemPrompt string) *Runner {
	return &Runner{
		agent: genticadapter.BuildAgent(model, systemPrompt),
		sllm:  openai.Provider{},
	}
}

// Invoke runs the agent for a single invoke request (batch completion).
func (r *Runner) Invoke(_ context.Context, req dto.InvokeRequest) (*dto.InvokeResponse, error) {
	input := gen.AgentInput{
		Query:    req.Message,
		Metadata: metadataFromInvoke(req),
	}

	state, err := r.agent.RunWithContext(input)
	if err != nil {
		return nil, err
	}

	out := &dto.InvokeResponse{
		OK:     true,
		Output: state.Output,
		Intent: state.Intent,
	}
	return out, nil
}

// Stream uses the same Resolver → Flow pipeline as Invoke; chat streams via ChatStep.Stream,
// create_campaign streams synthetic tokens after CreateCampaignStep.Run.
func (r *Runner) Stream(ctx context.Context, req dto.InvokeRequest) (<-chan gen.StreamEvent, error) {
	input := gen.AgentInput{
		Query:    req.Message,
		Metadata: metadataFromInvoke(req),
	}
	return r.agent.StreamWithContext(ctx, input, r.sllm)
}

func metadataFromInvoke(req dto.InvokeRequest) map[string]interface{} {
	meta := map[string]interface{}{
		"thread_id": req.ThreadID,
	}
	if req.AnalyticsID != nil {
		meta["analytics_id"] = *req.AnalyticsID
	}
	if req.LocationID != nil {
		meta["location_id"] = *req.LocationID
	}
	if req.DateStart != nil {
		meta["date_start"] = *req.DateStart
	}
	if req.DateEnd != nil {
		meta["date_end"] = *req.DateEnd
	}
	if len(req.NationalHolidays) > 0 {
		meta["national_holidays"] = string(req.NationalHolidays)
	}
	return meta
}
