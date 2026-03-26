package step

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/daniel-dihardja/gentic-agents/internal/platform/graphql"
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
	"github.com/daniel-dihardja/gentic/pkg/gentic/reflect"
	"github.com/daniel-dihardja/gentic/pkg/providers/openai"
)

const (
	campaignBriefGenerationSystem = "You are a senior restaurant social media strategist. Follow the instructions precisely. Reply with valid JSON only, no markdown."
	campaignBriefReflectionSystem = "You are a quality reviewer for restaurant Instagram campaign strategy briefs."
	campaignBriefNotifySystem     = "You are a helpful assistant for restaurant marketing. Write concise, friendly user-facing confirmations."
)

// llmBriefPayload is the JSON shape expected from the generation model.
type llmBriefPayload struct {
	CampaignTheme  string `json:"campaign_theme"`
	Tone           string `json:"tone"`
	TargetAudience string `json:"target_audience"`
	PostingCadence string `json:"posting_cadence"`
}

// CreateCampaignBriefStep generates a campaign brief (with reflection) and stores it in state only.
type CreateCampaignBriefStep struct {
	Model                   string
	MaxReflectionIterations int
}

// Run implements gentic.Step.
func (s CreateCampaignBriefStep) Run(ctx context.Context, state *gen.State) error {
	if hasValidPersistedCampaignBrief(state) {
		return nil
	}

	campaignID := campaignIDFromMetadata(state)
	_, _, ok := requiredLocationIDs(state, "create campaign brief")
	if !ok {
		return nil
	}

	profile, ok := locationProfileFromMetadata(state)
	if !ok || strings.TrimSpace(profile.Summary) == "" {
		state.Output = "Cannot create campaign brief: location profile is missing. Complete the location profile step first."
		return nil
	}

	ctx, cancel := context.WithTimeout(ctx, 5*time.Minute)
	defer cancel()

	n := gen.NotifierFromContext(ctx)
	n.Notify("create_campaign_brief", gen.ActivityRunning, "Create a campaign brief")

	llm := openai.Provider{}
	model := s.Model
	if model == "" {
		model = openai.DefaultModel
	}

	genPrompt := buildCampaignBriefUserPrompt(profile.Summary)
	refSnap := buildCampaignBriefReflectionSnapshot(profile.Summary)

	n.Notify("create_campaign_brief", gen.ActivityDone, "Create a campaign brief")

	totalRefine := s.MaxReflectionIterations + 1
	rawDraft, err := reflect.RunReflectLoop(ctx, reflect.ReflectLoopParams{
		LLM:                    llm,
		Model:                  model,
		MaxIterations:          s.MaxReflectionIterations,
		GenerationSystemPrompt: campaignBriefGenerationSystem,
		ReflectionSystemPrompt: campaignBriefReflectionSystem,
		GenerationPrompt:       genPrompt,
		BuildReflectionUser: func(draft string) string {
			return buildCampaignBriefReflectionUser(refSnap, draft)
		},
		BuildRevisionPrompt: buildCampaignBriefRevisionPrompt,
		OnIteration: func(ctx context.Context, current, total int) {
			nn := gen.NotifierFromContext(ctx)
			nn.Notify("campaign_brief_refinement", gen.ActivityReflecting,
				fmt.Sprintf("Refining (%d/%d)", current, total))
		},
	})
	if err != nil {
		return err
	}
	n.Notify("campaign_brief_refinement", gen.ActivityDone,
		fmt.Sprintf("Refining (%d/%d)", totalRefine, totalRefine))

	payload, err := parseBriefJSON(rawDraft)
	if err != nil {
		return fmt.Errorf("campaign brief: parse LLM output: %w", err)
	}

	state.SetMetadata(metadataKeyCampaignBrief, &graphql.CampaignBrief{
		CampaignTheme:  strings.TrimSpace(payload.CampaignTheme),
		Tone:           strings.TrimSpace(payload.Tone),
		TargetAudience: strings.TrimSpace(payload.TargetAudience),
		PostingCadence: strings.TrimSpace(payload.PostingCadence),
	})

	EmitPlanningProgress(ctx, state)

	notify, err := llm.Chat(ctx, model, campaignBriefNotifySystem, buildCampaignBriefNotifyPrompt(payload))
	if err != nil {
		notify = fallbackCampaignBriefMessage(payload)
	} else {
		notify = strings.TrimSpace(notify)
		if notify == "" {
			notify = fallbackCampaignBriefMessage(payload)
		}
	}

	state.Output = notify + "\n\n" + formatCampaignBriefForUser(payload)
	detail := campaignID
	if detail == "" {
		detail = state.SecureMetadata().GetString("thread_id")
	}
	n.Notify("campaign_brief_ready", gen.ActivityDone, "Campaign brief ready", gen.WithDetail(detail))
	return nil
}

func locationProfileFromMetadata(state *gen.State) (*graphql.LocationProfile, bool) {
	if state == nil {
		return nil, false
	}
	v, ok := state.GetMetadata(metadataKeyLocationProfile)
	if !ok {
		return nil, false
	}
	p, ok := v.(*graphql.LocationProfile)
	if !ok || p == nil {
		return nil, false
	}
	return p, true
}

func buildCampaignBriefUserPrompt(locationSummary string) string {
	return fmt.Sprintf(`Based on this restaurant marketing / location profile, produce a concise Instagram campaign strategy brief.

Location profile:
---
%s
---

Return a single JSON object with exactly these keys (use double quotes, no trailing commentary):
{
  "campaign_theme": "<one sentence: overarching creative theme for the campaign>",
  "tone": "<brand voice in a few words, e.g. warm and conversational>",
  "target_audience": "<1-3 sentences describing who we are speaking to>",
  "posting_cadence": "<recommended cadence in plain language, e.g. 4-5 posts per week with emphasis on dinner lead time>"
}

Do not include post-level schedules or specific dates. Do not repeat the full profile text.`, locationSummary)
}

func buildCampaignBriefReflectionSnapshot(locationSummary string) string {
	s := locationSummary
	if len(s) > 400 {
		s = s[:400] + "…"
	}
	return "Location profile excerpt (for traceability):\n" + s
}

func buildCampaignBriefReflectionUser(snapshot, draft string) string {
	return snapshot + `

Generated JSON brief to review:
` + draft + `

Evaluate against every criterion below. If ALL criteria are met, respond with exactly:
PASS

If ANY criterion fails, respond with:
IMPROVE:
- <specific issue 1>
- <specific issue 2>
(add more lines as needed)

Criteria:
1. The response is valid JSON with exactly these keys: campaign_theme, tone, target_audience, posting_cadence (no extra keys)

2. campaign_theme is one clear sentence aligned with the location profile positioning

3. tone is a short, usable brand voice label (not generic filler)

4. target_audience is 1–3 concrete sentences grounded in the profile (no invented facts beyond reasonable inference from the profile)

5. posting_cadence is actionable cadence guidance in plain language

6. Values are non-empty strings after trimming`
}

func buildCampaignBriefRevisionPrompt(originalGenerationPrompt, previousDraft, feedback string) string {
	return fmt.Sprintf(`You are a senior restaurant social media strategist. Revise the JSON campaign brief below based on reviewer feedback.

%s

---
Previous draft (valid JSON only — improve it, do not add markdown fences):
%s

Reviewer feedback — address every point:
%s

Write the improved JSON object now, with the same four keys as specified in the original task.`,
		originalGenerationPrompt,
		previousDraft,
		feedback,
	)
}

func parseBriefJSON(raw string) (llmBriefPayload, error) {
	s := strings.TrimSpace(raw)
	s = strings.TrimPrefix(s, "```json")
	s = strings.TrimPrefix(s, "```JSON")
	s = strings.TrimPrefix(s, "```")
	s = strings.TrimSpace(s)
	if i := strings.LastIndex(s, "```"); i >= 0 {
		s = strings.TrimSpace(s[:i])
	}

	var payload llmBriefPayload
	if err := json.Unmarshal([]byte(s), &payload); err != nil {
		return payload, err
	}
	if strings.TrimSpace(payload.CampaignTheme) == "" {
		return payload, fmt.Errorf("empty campaign_theme")
	}
	return payload, nil
}

func buildCampaignBriefNotifyPrompt(p llmBriefPayload) string {
	return fmt.Sprintf(`A campaign brief was just prepared (in this session) with theme: %q, tone: %q.

Write 2–3 short sentences to the user confirming the brief is ready. Mention theme and tone briefly. Do not paste the full JSON or all fields verbatim.`, p.CampaignTheme, p.Tone)
}

func fallbackCampaignBriefMessage(p llmBriefPayload) string {
	return fmt.Sprintf("Your campaign brief is ready. Theme: %s", p.CampaignTheme)
}

func formatCampaignBriefForUser(p llmBriefPayload) string {
	var b strings.Builder
	fmt.Fprintf(&b, "**Theme:** %s\n\n", p.CampaignTheme)
	fmt.Fprintf(&b, "**Tone:** %s\n\n", p.Tone)
	fmt.Fprintf(&b, "**Target audience:** %s\n\n", p.TargetAudience)
	fmt.Fprintf(&b, "**Posting cadence:** %s", p.PostingCadence)
	return b.String()
}
