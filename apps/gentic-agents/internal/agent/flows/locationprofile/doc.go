// Package locationprofile implements the location profile flow: check/create persisted
// profiles and a ReAct chat for viewing and editing.
//
// Metadata for the profile is managed via flowstate; see
// github.com/daniel-dihardja/gentic-agents/internal/agent/flowstate for
// LocationProfileFromMetadata, HasValidPersistedLocationProfile,
// NeedsLocationProfileCreation, RequiredLocationIDs, and KeyLocationProfile.
package locationprofile
