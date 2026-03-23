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
			writeJSON(w, http.StatusBadRequest, dto.InvokeResponse{
				OK:    false,
				Error: "invalid JSON body",
			})
			return
		}
		if req.Message == "" {
			writeJSON(w, http.StatusBadRequest, dto.InvokeResponse{
				OK:    false,
				Error: "message is required",
			})
			return
		}

		resp, err := runner.Invoke(r.Context(), req)
		if err != nil {
			log.Printf("invoke: %v", err)
			writeJSON(w, http.StatusInternalServerError, dto.InvokeResponse{
				OK:    false,
				Error: "agent run failed",
			})
			return
		}

		writeJSON(w, http.StatusOK, *resp)
	}
}

func writeJSON(w http.ResponseWriter, status int, v dto.InvokeResponse) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("encode response: %v", err)
	}
}
