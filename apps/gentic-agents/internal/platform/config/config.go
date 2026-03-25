package config

import (
	"fmt"
	"os"
	"strconv"
)

const (
	defaultAddr                    = ":7000"
	defaultModel                   = "gpt-4o-mini"
	defaultSystemPrompt            = "You are a helpful assistant for restaurant and menu planning. Answer clearly and concisely."
	defaultMaxReflectionIterations = 1
	envMaxReflectionIterations     = "MAX_REFLECTION_ITERATIONS"
)

// Config holds runtime settings loaded from the environment.
type Config struct {
	Addr                    string
	OpenAIAPIKey            string
	Model                   string
	SystemPrompt            string
	GraphQLEndpoint         string
	MaxReflectionIterations int
}

// Load reads configuration from process environment (after optional godotenv in main).
func Load() (Config, error) {
	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" {
		return Config{}, fmt.Errorf("OPENAI_API_KEY is required")
	}

	gqlEndpoint := os.Getenv("GRAPHQL_ENDPOINT")
	if gqlEndpoint == "" {
		return Config{}, fmt.Errorf("GRAPHQL_ENDPOINT is required")
	}

	addr := os.Getenv("ADDR")
	if addr == "" {
		addr = defaultAddr
	}

	model := os.Getenv("OPENAI_MODEL")
	if model == "" {
		model = defaultModel
	}

	system := os.Getenv("SYSTEM_PROMPT")
	if system == "" {
		system = defaultSystemPrompt
	}

	maxReflect := defaultMaxReflectionIterations
	if v := os.Getenv(envMaxReflectionIterations); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil {
			return Config{}, fmt.Errorf("%s must be a non-negative integer: %w", envMaxReflectionIterations, err)
		}
		if n < 0 {
			return Config{}, fmt.Errorf("%s must be >= 0", envMaxReflectionIterations)
		}
		maxReflect = n
	}

	return Config{
		Addr:                    addr,
		OpenAIAPIKey:            apiKey,
		Model:                   model,
		SystemPrompt:            system,
		GraphQLEndpoint:         gqlEndpoint,
		MaxReflectionIterations: maxReflect,
	}, nil
}
