package api

import (
	"net/http"

	"github.com/daniel-dihardja/gentic-agents/internal/agent"
	"github.com/daniel-dihardja/gentic-agents/internal/api/handler"
	"github.com/daniel-dihardja/gentic-agents/internal/api/middleware"
)

// NewRouter wires routes and middleware: recovery → logging → request ID → mux.
func NewRouter(runner *agent.Runner) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /invoke", handler.Invoke(runner))

	chain := middleware.Chain(
		mux,
		middleware.Recovery,
		middleware.Logging,
		middleware.RequestID,
	)
	return chain
}
