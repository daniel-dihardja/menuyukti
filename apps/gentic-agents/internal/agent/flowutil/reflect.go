package flowutil

import (
	"context"
	"fmt"
	"time"

	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
	"github.com/daniel-dihardja/gentic/pkg/providers/openai"
)

// ReflectConfig holds common reflection step configuration and provides defaults.
type ReflectConfig struct {
	LLM                     gen.LLM
	Model                   string
	MaxReflectionIterations int
	Timeout                 time.Duration
}

// DefaultLLM returns the configured LLM or openai.Provider{} if nil.
func (c ReflectConfig) DefaultLLM() gen.LLM {
	if c.LLM != nil {
		return c.LLM
	}
	return openai.Provider{}
}

// DefaultModel returns the configured model or openai.DefaultModel if empty.
func (c ReflectConfig) DefaultModel() string {
	if c.Model != "" {
		return c.Model
	}
	return openai.DefaultModel
}

// WithTimeout returns a context with the configured timeout (default 5 minutes).
func (c ReflectConfig) WithTimeout(ctx context.Context) (context.Context, context.CancelFunc) {
	t := c.Timeout
	if t == 0 {
		t = 5 * time.Minute
	}
	return context.WithTimeout(ctx, t)
}

// NotifyRefining returns an OnIteration callback that emits refinement activity notifications.
func NotifyRefining(stepID string) func(ctx context.Context, current, total int) {
	return func(ctx context.Context, current, total int) {
		n := gen.NotifierFromContext(ctx)
		if n != nil {
			n.Notify(stepID+"_refinement", gen.ActivityReflecting,
				fmt.Sprintf("Refining (%d/%d)", current, total))
		}
	}
}
