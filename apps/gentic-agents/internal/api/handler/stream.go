package handler

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/daniel-dihardja/gentic-agents/internal/agent"
	"github.com/daniel-dihardja/gentic-agents/internal/api/dto"
)

// InvokeStream handles POST /invoke/stream — SSE with {"delta":"..."} lines and data: [DONE].
func InvokeStream(runner *agent.Runner) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Body != nil {
			defer r.Body.Close()
		}

		var req dto.InvokeRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid JSON body", http.StatusBadRequest)
			return
		}
		if req.Message == "" {
			http.Error(w, "message is required", http.StatusBadRequest)
			return
		}

		flusher, ok := w.(http.Flusher)
		if !ok {
			http.Error(w, "streaming not supported", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")
		w.Header().Set("X-Accel-Buffering", "no")

		events, err := runner.Stream(r.Context(), req)
		if err != nil {
			log.Printf("stream: %v", err)
			writeSSEData(w, flusher, map[string]string{"error": err.Error()})
			return
		}

		for ev := range events {
			if ev.Token.Error != nil {
				writeSSEData(w, flusher, map[string]string{"error": ev.Token.Error.Error()})
				return
			}
			if ev.Token.Text != "" {
				writeSSEData(w, flusher, map[string]string{"delta": ev.Token.Text})
			}
			if ev.Token.Done {
				fmt.Fprintf(w, "data: [DONE]\n\n")
				flusher.Flush()
				return
			}
		}
		fmt.Fprintf(w, "data: [DONE]\n\n")
		flusher.Flush()
	}
}

func writeSSEData(w http.ResponseWriter, flusher http.Flusher, v map[string]string) {
	b, err := json.Marshal(v)
	if err != nil {
		log.Printf("sse marshal: %v", err)
		return
	}
	fmt.Fprintf(w, "data: %s\n\n", b)
	flusher.Flush()
}
