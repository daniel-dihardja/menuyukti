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

// Stream resolves intent via the router only (no chat LLM run yet). For create_campaign,
// runs CreateCampaignStep once and returns a synthetic token stream. Otherwise uses
// StreamWithContext + OpenAI streaming (single LLM call for chat).
func (r *Runner) Stream(ctx context.Context, req dto.InvokeRequest) (<-chan gen.StreamEvent, error) {
	meta := metadataFromInvoke(req)
	a := genticadapter.BuildAgent(r.model, r.systemPrompt)
	state := &gen.State{
		Input:    req.Message,
		Metadata: meta,
	}
	flow := a.Resolver.Resolve(state)
	if state.Intent == "create_campaign" {
		if err := flow.Run(state); err != nil {
			return nil, err
		}
		out := make(chan gen.StreamEvent, 2)
		go func() {
			defer close(out)
			out <- gen.StreamEvent{Token: gen.StreamToken{Text: state.Output}}
			out <- gen.StreamEvent{Token: gen.StreamToken{Done: true}}
		}()
		return out, nil
	}

	streamAgent := genticadapter.BuildStreamingAgent()
	input := gen.AgentInput{
		Query:        req.Message,
		Metadata:     meta,
		Model:        r.model,
		SystemPrompt: r.systemPrompt,
	}
	return streamAgent.StreamWithContext(ctx, input, openai.Provider{})
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
