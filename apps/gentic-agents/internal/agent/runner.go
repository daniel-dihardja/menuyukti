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
	model        string
	systemPrompt string
}

// NewRunner constructs a Runner.
func NewRunner(model, systemPrompt string) *Runner {
	return &Runner{
		model:        model,
		systemPrompt: systemPrompt,
	}
}

// Invoke runs the agent for a single invoke request (batch completion).
func (r *Runner) Invoke(_ context.Context, req dto.InvokeRequest) (*dto.InvokeResponse, error) {
	agent := genticadapter.BuildAgent(r.model, r.systemPrompt)

	input := gen.AgentInput{
		Query:    req.Message,
		Metadata: metadataFromInvoke(req),
	}

	state, err := agent.RunWithContext(input)
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

// Stream runs a token stream via Gentic StreamWithContext + OpenAI streaming.
func (r *Runner) Stream(ctx context.Context, req dto.InvokeRequest) (<-chan gen.StreamEvent, error) {
	agent := genticadapter.BuildStreamingAgent()
	meta := metadataFromInvoke(req)
	input := gen.AgentInput{
		Query:        req.Message,
		Metadata:     meta,
		Model:        r.model,
		SystemPrompt: r.systemPrompt,
	}
	return agent.StreamWithContext(ctx, input, openai.Provider{})
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
	if req.LocationProfile != nil {
		meta["location_profile"] = *req.LocationProfile
	}
	return meta
}
