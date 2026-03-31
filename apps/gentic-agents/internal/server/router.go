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
	AllowOrigins []string
	// AgentsAPIKey when non-empty requires matching X-Internal-Api-Key on /invoke and /invoke/stream.
	AgentsAPIKey string
}

func agentsAPIKeyMiddleware(next http.Handler, apiKey string) http.Handler {
	if apiKey == "" {
		return next
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("X-Internal-Api-Key") != apiKey {
			http.Error(w, "Forbidden", http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// NewRouter wires POST /invoke and POST /invoke/stream with recovery → logging → request ID.
// It uses the framework [gensrv.Runner] with this app's domain-specific [InvokeRequest] in handlers.
func NewRouter(cfg Config) http.Handler {
	runner := gensrv.NewRunner(cfg.Agent, cfg.StreamingLLM)
	mux := http.NewServeMux()
	mux.HandleFunc("POST /invoke", InvokeHandler(runner))
	mux.HandleFunc("POST /invoke/stream", StreamHandler(runner))

	var h http.Handler = mux
	h = agentsAPIKeyMiddleware(h, cfg.AgentsAPIKey)

	return middleware.Chain(
		h,
		middleware.Recovery,
		middleware.Logging,
		middleware.RequestID,
	)
}
