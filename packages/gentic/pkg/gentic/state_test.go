package gentic

import "testing"

func TestCloneForParallelExecution(t *testing.T) {
	t.Parallel()
	s := &State{
		Input:        "in",
		Intent:       "intent",
		ActionPlan:   [][]string{{"a"}},
		Thoughts:     []string{"t"},
		Observations: []Observation{{TaskID: "x", Content: "y"}},
		Output:       "out",
		Messages:     []Message{{Role: "user", Parts: []MessagePart{{Type: "text", Text: "hi"}}}},
		Metadata:     map[string]interface{}{"k": 1},
	}
	c := s.CloneForParallelExecution()
	if c == nil {
		t.Fatal("expected non-nil clone")
	}
	if len(c.Observations) != 0 {
		t.Fatalf("Observations should be cleared, got %#v", c.Observations)
	}
	if c.Input != s.Input || c.Intent != s.Intent || c.Output != s.Output {
		t.Fatal("string fields should match")
	}
	if len(c.ActionPlan) != 1 || len(c.Thoughts) != 1 || len(c.Messages) != 1 {
		t.Fatal("slice fields should be shared shallowly")
	}
	if c.Metadata["k"] != 1 {
		t.Fatal("metadata map pointer should be shared")
	}
}

func TestCloneForParallelExecution_nilReceiver(t *testing.T) {
	t.Parallel()
	var s *State
	c := s.CloneForParallelExecution()
	if c == nil || c.Input != "" {
		t.Fatalf("expected empty state, got %#v", c)
	}
}
