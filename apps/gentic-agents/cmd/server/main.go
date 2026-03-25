package main

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	genticadapter "github.com/daniel-dihardja/gentic-agents/internal/gentic"
	"github.com/daniel-dihardja/gentic-agents/internal/platform/config"
	"github.com/daniel-dihardja/gentic/pkg/providers/openai"
	"github.com/daniel-dihardja/gentic/pkg/server"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Printf("godotenv: %v (continuing with process env)", err)
	}

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	ag := genticadapter.BuildAgent(cfg.Model, cfg.SystemPrompt, cfg.GraphQLEndpoint, cfg.MaxReflectionIterations)
	handler := server.NewRouter(server.Config{
		Agent:        ag,
		StreamingLLM: openai.Provider{},
		Model:        cfg.Model,
		SystemPrompt: cfg.SystemPrompt,
	})

	mux := http.NewServeMux()
	mux.Handle("/", handler)
	mux.HandleFunc("POST /api/v1/echo", echoHandler)

	srv := &http.Server{
		Addr:              cfg.Addr,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      120 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		log.Printf("listening on %s", cfg.Addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("server: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("shutdown: %v", err)
	}
}

type echoRequest struct {
	Message string `json:"message"`
}

type echoResponse struct {
	OK    bool   `json:"ok"`
	Echo  string `json:"echo"`
	Error string `json:"error,omitempty"`
}

func echoHandler(w http.ResponseWriter, r *http.Request) {
	if r.Body != nil {
		defer r.Body.Close()
	}

	var req echoRequest
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		writeJSONEcho(w, http.StatusBadRequest, echoResponse{OK: false, Error: "invalid JSON body"})
		return
	}

	writeJSONEcho(w, http.StatusOK, echoResponse{OK: true, Echo: req.Message})
}

func writeJSONEcho(w http.ResponseWriter, status int, v echoResponse) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("encode response: %v", err)
	}
}
