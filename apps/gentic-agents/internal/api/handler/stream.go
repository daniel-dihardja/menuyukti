package handler

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/daniel-dihardja/gentic-agents/internal/agent"
	"github.com/daniel-dihardja/gentic-agents/internal/api/dto"
	"github.com/daniel-dihardja/gentic/pkg/sse"
)

// InvokeStream handles POST /invoke/stream — SSE with {"delta":"..."} lines and data: [DONE].
func InvokeStream(runner *agent.Runner) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Body != nil {
			defer r.Body.Close()
		}

		var req dto.InvokeRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}
		if req.Message == "" {
			writeError(w, http.StatusBadRequest, "message is required")
			return
		}

		sw, err := sse.New(w)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "streaming not supported")
			return
		}

		events, err := runner.Stream(r.Context(), req)
		if err != nil {
			log.Printf("stream: %v", err)
			b, mErr := json.Marshal(map[string]string{"error": err.Error()})
			if mErr != nil {
				log.Printf("sse marshal: %v", mErr)
				return
			}
			sw.WriteData(b)
			return
		}

		if err := sw.Drain(r.Context(), events); err != nil {
			log.Printf("stream drain: %v", err)
		}
	}
}
