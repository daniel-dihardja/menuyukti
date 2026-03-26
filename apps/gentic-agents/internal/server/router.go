package server

import (
	"net/http"

	"github.com/daniel-dihardja/gentic/pkg/gentic"
	"github.com/daniel-dihardja/gentic/pkg/middleware"
	gensrv "github.com/daniel-dihardja/gentic/pkg/server"
)

// Config holds dependencies for the gentic-agents HTTP router.
type Config struct {
	Agent        gentic.Agent
	StreamingLLM gentic.StreamingLLM
	Model        string
	SystemPrompt string
	AllowOrigins []string
}

// NewRouter wires POST /invoke and POST /invoke/stream with recovery → logging → request ID.
// It uses the framework [gensrv.Runner] with this app's domain-specific [InvokeRequest] in handlers.
func NewRouter(cfg Config) http.Handler {
	runner := gensrv.NewRunner(cfg.Agent, cfg.StreamingLLM)
	mux := http.NewServeMux()
	mux.HandleFunc("POST /invoke", InvokeHandler(runner))
	mux.HandleFunc("POST /invoke/stream", StreamHandler(runner))

	return middleware.Chain(
		mux,
		middleware.Recovery,
		middleware.Logging,
		middleware.RequestID,
	)
}
