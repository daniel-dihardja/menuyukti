package step

import (
	"testing"

	"github.com/daniel-dihardja/gentic-agents/internal/platform/graphql"
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
)

func TestHasValidPersistedLocationProfile(t *testing.T) {
	t.Parallel()

	id := graphql.ID("loc-1")
	summary := "A solid summary."

	tests := []struct {
		name  string
		state *gen.State
		want  bool
	}{
		{
			name:  "nil state",
			state: nil,
			want:  false,
		},
		{
			name:  "nil metadata",
			state: &gen.State{},
			want:  false,
		},
		{
			name: "missing key",
			state: &gen.State{
				Metadata: map[string]interface{}{},
			},
			want: false,
		},
		{
			name: "wrong type",
			state: &gen.State{
				Metadata: map[string]interface{}{
					metadataKeyLocationProfile: "not-a-profile",
				},
			},
			want: false,
		},
		{
			name: "nil profile pointer",
			state: &gen.State{
				Metadata: map[string]interface{}{
					metadataKeyLocationProfile: (*graphql.LocationProfile)(nil),
				},
			},
			want: false,
		},
		{
			name: "empty summary",
			state: &gen.State{
				Metadata: map[string]interface{}{
					metadataKeyLocationProfile: &graphql.LocationProfile{
						ID:      id,
						Summary: "   ",
					},
				},
			},
			want: false,
		},
		{
			name: "valid profile",
			state: &gen.State{
				Metadata: map[string]interface{}{
					metadataKeyLocationProfile: &graphql.LocationProfile{
						ID:      id,
						Summary: summary,
					},
				},
			},
			want: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			if got := hasValidPersistedLocationProfile(tt.state); got != tt.want {
				t.Fatalf("hasValidPersistedLocationProfile() = %v, want %v", got, tt.want)
			}
			wantNeeds := !tt.want
			if got := NeedsLocationProfileCreation(tt.state); got != wantNeeds {
				t.Fatalf("NeedsLocationProfileCreation() = %v, want %v", got, wantNeeds)
			}
		})
	}
}

func TestNeedsLocationProfileCreation_negation(t *testing.T) {
	t.Parallel()
	state := &gen.State{
		Metadata: map[string]interface{}{
			metadataKeyLocationProfile: &graphql.LocationProfile{
				ID:      graphql.ID("x"),
				Summary: "ok",
			},
		},
	}
	if !hasValidPersistedLocationProfile(state) {
		t.Fatal("want valid profile")
	}
	if NeedsLocationProfileCreation(state) {
		t.Fatal("should not need creation when valid profile present")
	}
}
