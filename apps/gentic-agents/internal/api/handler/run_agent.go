package handler

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/daniel-dihardja/gentic-agents/internal/agent"
	"github.com/daniel-dihardja/gentic-agents/internal/api/dto"
)

// Invoke handles POST /invoke — validates JSON, runs the agent, returns JSON.
func Invoke(runner *agent.Runner) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Body != nil {
			defer r.Body.Close()
		}

		var req dto.InvokeRequest
		dec := json.NewDecoder(r.Body)
		if err := dec.Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}
		if req.Message == "" {
			writeError(w, http.StatusBadRequest, "message is required")
			return
		}

		resp, err := runner.Invoke(r.Context(), req)
		if err != nil {
			log.Printf("invoke: %v", err)
			writeError(w, http.StatusInternalServerError, "agent run failed")
			return
		}

		writeJSON(w, http.StatusOK, *resp)
	}
}
