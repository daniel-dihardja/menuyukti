package graphql

import "context"

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
