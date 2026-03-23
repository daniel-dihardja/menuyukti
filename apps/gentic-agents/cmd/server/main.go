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

	"github.com/daniel-dihardja/gentic/pkg/gentic"
	"github.com/daniel-dihardja/gentic/pkg/providers/openai"
	"github.com/joho/godotenv"
)

const defaultAddr = ":7000"

type AskStep struct{}

func (a AskStep) Run(s *gentic.State) error {
	resp, err := openai.Chat(openai.ChatCompletionRequest{
		Model: "gpt-4o-mini",
		Messages: []openai.ChatMessage{
			{Role: "user", Content: s.Input},
		},
	})
	if err != nil {
		return err
	}

	s.Output = resp.Choices[0].Message.Content
	return nil
}

type MyResolver struct{}

func (r MyResolver) Resolve(s *gentic.State) gentic.Flow {
	return gentic.NewFlow(
		AskStep{},
	)
}

func main() {
	if err := godotenv.Load(); err != nil {
		log.Printf("godotenv: %v (continuing with process env)", err)
	}

	agent := gentic.Agent{
		Resolver: MyResolver{},
	}

	addr := os.Getenv("ADDR")
	if addr == "" {
		addr = defaultAddr
	}

	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/v1/echo", echoHandler)
	mux.HandleFunc("POST /api/v1/invoke", invokeHandler(&agent))

	srv := &http.Server{
		Addr:              addr,
		Handler:           logRequest(mux),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      120 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		log.Printf("listening on %s", addr)
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

type invokeResponse struct {
	OK     bool   `json:"ok"`
	Output string `json:"output,omitempty"`
	Error  string `json:"error,omitempty"`
}

func echoHandler(w http.ResponseWriter, r *http.Request) {
	if r.Body != nil {
		defer r.Body.Close()
	}

	var req echoRequest
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, echoResponse{OK: false, Error: "invalid JSON body"})
		return
	}

	writeJSON(w, http.StatusOK, echoResponse{OK: true, Echo: req.Message})
}

func invokeHandler(agent *gentic.Agent) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Body != nil {
			defer r.Body.Close()
		}

		var req echoRequest
		dec := json.NewDecoder(r.Body)
		dec.DisallowUnknownFields()
		if err := dec.Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, invokeResponse{OK: false, Error: "invalid JSON body"})
			return
		}
		if req.Message == "" {
			writeJSON(w, http.StatusBadRequest, invokeResponse{OK: false, Error: "message is required"})
			return
		}

		result, err := agent.Run(req.Message)
		if err != nil {
			log.Printf("agent run: %v", err)
			writeJSON(w, http.StatusInternalServerError, invokeResponse{OK: false, Error: "agent run failed"})
			return
		}

		writeJSON(w, http.StatusOK, invokeResponse{OK: true, Output: result.Output})
	}
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("encode response: %v", err)
	}
}

func logRequest(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("%s %s", r.Method, r.URL.Path)
		next.ServeHTTP(w, r)
	})
}
