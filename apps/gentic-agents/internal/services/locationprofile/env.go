package locationprofile

import "os"

// NewServiceFromEnv builds a Service using GRAPHQL_ENDPOINT.
// GRAPHQL_ENDPOINT must be set to the GraphQL HTTP URL (same as apps/agents GRAPHQL_ENDPOINT).
func NewServiceFromEnv() (*Service, error) {
	return NewService(os.Getenv("GRAPHQL_ENDPOINT"), nil)
}
