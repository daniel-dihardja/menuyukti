package handler

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/daniel-dihardja/gentic-agents/internal/api/dto"
)

// writeError writes a JSON error body in the same shape as InvokeResponse.
func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, dto.InvokeResponse{
		OK:    false,
		Error: message,
	})
}

func writeJSON(w http.ResponseWriter, status int, v dto.InvokeResponse) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("encode response: %v", err)
	}
}
