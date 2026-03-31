package locationprofile

import (
	"context"

	// For now, re-export from step package. During phase 5, this will be moved to flows/.
	"github.com/daniel-dihardja/gentic-agents/internal/agent/step"
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
)

// EmitPlanningProgress sends a data-planning SSE payload so the web artifact updates before save completes.
// (Temporary wrapper; will be moved to flows during phase 5)
func EmitPlanningProgress(ctx context.Context, state *gen.State) {
	step.EmitPlanningProgress(ctx, state)
}
