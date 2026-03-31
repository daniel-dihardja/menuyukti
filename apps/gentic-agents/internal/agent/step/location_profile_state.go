package step

// This file is deprecated. Use github.com/daniel-dihardja/gentic-agents/internal/agent/flowstate instead.
// Keeping function aliases for backward compatibility during migration.

import (
	fs "github.com/daniel-dihardja/gentic-agents/internal/agent/flowstate"
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
)

// Deprecated: use flowstate.RequiredLocationIDs
func requiredLocationIDs(state *gen.State, op string) (string, string, bool) {
	return fs.RequiredLocationIDs(state, op)
}

// Deprecated: use flowstate.HasValidPersistedLocationProfile
func hasValidPersistedLocationProfile(state *gen.State) bool {
	return fs.HasValidPersistedLocationProfile(state)
}

// Deprecated: use flowstate.NeedsLocationProfileCreation
func NeedsLocationProfileCreation(state *gen.State) bool {
	return fs.NeedsLocationProfileCreation(state)
}

// Deprecated: use flowstate.LocationProfileFromMetadata
func locationProfileFromMetadata(state *gen.State) (interface{}, bool) {
	return fs.LocationProfileFromMetadata(state)
}
