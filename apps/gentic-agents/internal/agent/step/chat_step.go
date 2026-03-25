package step

import (
	"context"

	"github.com/daniel-dihardja/gentic/pkg/gentic"
	"github.com/daniel-dihardja/gentic/pkg/providers/openai"
)

// ChatStep runs a single non-streaming OpenAI chat completion and writes the reply to state.
type ChatStep struct {
	Model        string
	SystemPrompt string
}

// Stream implements gentic.StreamingStep — streams tokens from the configured model.
func (c ChatStep) Stream(ctx context.Context, s *gentic.State, sllm gentic.StreamingLLM) (<-chan gentic.StreamEvent, error) {
	model := c.Model
	if model == "" {
		model = openai.DefaultModel
	}
	return sllm.ChatStream(ctx, model, c.SystemPrompt, s.Input)
}

// Run implements gentic.Step.
func (c ChatStep) Run(s *gentic.State) error {
	resp, err := openai.Chat(openai.ChatCompletionRequest{
		Model: c.Model,
		Messages: []openai.ChatMessage{
			{Role: "system", Content: c.SystemPrompt},
			{Role: "user", Content: s.Input},
		},
	})
	if err != nil {
		return err
	}
	if len(resp.Choices) == 0 {
		s.Output = ""
		return nil
	}
	s.Output = resp.Choices[0].Message.Content
	return nil
}
