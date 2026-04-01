package graphql

import (
	"context"

	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
)

// userIDMetadataKey must match [github.com/daniel-dihardja/gentic-agents/internal/agent/flowstate.KeyUserID].
const userIDMetadataKey = "_user_id"

type userIDCtxKey struct{}

// ContextWithUserID attaches the Clerk user id for outbound GraphQL X-User-Id.
func ContextWithUserID(ctx context.Context, userID string) context.Context {
	if userID == "" {
		return ctx
	}
	return context.WithValue(ctx, userIDCtxKey{}, userID)
}

// UserIDFromContext returns the user id set by ContextWithUserID.
func UserIDFromContext(ctx context.Context) string {
	v, _ := ctx.Value(userIDCtxKey{}).(string)
	return v
}

// GraphQLContext returns ctx for outbound GraphQL calls. It uses UserIDFromContext when set;
// otherwise it reads userIDMetadataKey from state (set by the HTTP handler for ReAct tools
// that only receive state, not the request context).
func GraphQLContext(ctx context.Context, state *gen.State) context.Context {
	if u := UserIDFromContext(ctx); u != "" {
		return ctx
	}
	if state == nil {
		return ctx
	}
	if v, ok := state.GetMetadata(userIDMetadataKey); ok {
		if s, ok := v.(string); ok && s != "" {
			return ContextWithUserID(ctx, s)
		}
	}
	return ctx
}
