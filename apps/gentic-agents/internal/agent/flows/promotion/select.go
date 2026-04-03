package promotion

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/daniel-dihardja/gentic-agents/internal/agent/flowstate"
	"github.com/daniel-dihardja/gentic-agents/internal/agent/step"
	"github.com/daniel-dihardja/gentic-agents/internal/platform/graphql"
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
	"github.com/daniel-dihardja/gentic/pkg/gentic/reflect"
	"github.com/daniel-dihardja/gentic/pkg/providers/openai"
)

const (
	selectPromotionGenerationSystem = "You are a senior restaurant marketer. Follow the instructions precisely."
	selectPromotionReflectionSystem = "You are a quality reviewer for Instagram promotion item selection."
)

// SelectStep curates matrix rows into a promotion shortlist using an LLM with reflection.
type SelectStep struct {
	LLM                     gen.LLM // nil → openai.Provider{}
	Model                   string
	MaxReflectionIterations int
}

type llmSelectedMenuNames struct {
	SelectedMenuNames []string `json:"selected_menu_names"`
}

// Run implements gen.Step.
func (s SelectStep) Run(ctx context.Context, state *gen.State) error {
	if flowstate.HasSelectedPromotionItems(state) {
		return nil
	}

	if _, _, ok := flowstate.RequiredLocationIDs(state, "select promotion items"); !ok {
		return nil
	}

	raw, ok := flowstate.PromotionItemsFromMetadata(state)
	if !ok {
		state.Output = "Cannot select promotion items: load menu data first."
		return nil
	}
	if len(raw) == 0 {
		state.SetMetadata(flowstate.KeySelectedPromotionItems, []graphql.MenuEngineeringItem{})
		step.EmitPlanningProgress(ctx, state)
		return nil
	}

	briefVal, ok := state.GetMetadata(flowstate.KeyCampaignBrief)
	if !ok {
		state.Output = "Cannot select promotion items: campaign brief is missing."
		return nil
	}
	brief, ok := briefVal.(*graphql.CampaignBrief)
	if !ok || brief == nil || strings.TrimSpace(brief.CampaignTheme) == "" {
		state.Output = "Cannot select promotion items: campaign brief is missing."
		return nil
	}

	ps, ok := flowstate.PostScheduleFromMetadata(state)
	if !ok || ps == nil || !flowstate.HasValidPostSchedule(state) {
		state.Output = "Cannot select promotion items: post schedule is missing."
		return nil
	}

	slotCount := countDistinctScheduleDates(ps)
	if slotCount == 0 {
		state.Output = "Cannot select promotion items: no scheduled dates."
		return nil
	}

	ctx, cancel := context.WithTimeout(ctx, 5*time.Minute)
	defer cancel()

	n := gen.NotifierFromContext(ctx)
	n.Notify("select_promotion_items", gen.ActivityRunning, "Select items to promote")

	llm := s.LLM
	if llm == nil {
		llm = openai.Provider{}
	}
	model := s.Model
	if model == "" {
		model = openai.DefaultModel
	}

	itemsBlock := flowstate.FormatItemsForPrompt(raw)
	genPrompt := buildSelectPromotionUserPrompt(brief, slotCount, itemsBlock)
	refSnap := buildSelectPromotionReflectionSnapshot(brief, slotCount, itemsBlock)

	refineTotal := reflect.ReflectUILabelTotal(s.MaxReflectionIterations)
	payload, err := reflect.RunTypedReflectLoop[llmSelectedMenuNames](ctx, reflect.ReflectLoopParams{
		LLM:                    llm,
		Model:                  model,
		MaxIterations:          s.MaxReflectionIterations,
		GenerationSystemPrompt: selectPromotionGenerationSystem,
		ReflectionSystemPrompt: selectPromotionReflectionSystem,
		GenerationPrompt:       genPrompt,
		BuildReflectionUser: func(draft string) string {
			return buildSelectPromotionReflectionUser(refSnap, draft)
		},
		BuildRevisionPrompt: buildSelectPromotionRevisionPrompt,
		OnIteration: func(ctx context.Context, current, total int) {
			nn := gen.NotifierFromContext(ctx)
			nn.Notify("select_promotion_refinement", gen.ActivityReflecting,
				fmt.Sprintf("Refining selection (%d/%d)", current, total))
		},
	})
	if err != nil {
		return fmt.Errorf("select promotion items: %w", err)
	}
	selected, err := resolveSelectedMenuNames(payload, raw)
	if err != nil {
		return fmt.Errorf("select promotion items: %w", err)
	}
	selected = ensureNonStarCarouselCandidates(selected, raw)

	n.Notify("select_promotion_refinement", gen.ActivityDone,
		fmt.Sprintf("Refining selection (%d/%d)", refineTotal, refineTotal))

	state.SetMetadata(flowstate.KeySelectedPromotionItems, selected)

	step.EmitPlanningProgress(ctx, state)

	n.Notify("select_promotion_items", gen.ActivityDone, fmt.Sprintf("%d item(s) selected", len(selected)))
	return nil
}

func countDistinctScheduleDates(ps *flowstate.PostSchedule) int {
	seen := map[string]struct{}{}
	for _, w := range ps.Weeks {
		for _, d := range w.SelectedDates {
			if d != "" {
				seen[d] = struct{}{}
			}
		}
	}
	return len(seen)
}

func buildSelectPromotionUserPrompt(brief *graphql.CampaignBrief, slotCount int, itemsBlock string) string {
	return fmt.Sprintf(`From the menu engineering candidates below, choose which dishes to feature in Instagram promotion posts for this campaign.

Campaign theme: %s
Tone: %s
Target audience: %s

You will assign these items to post formats in a later step. There are %d distinct posting dates in the schedule — select enough items to cover strong promotion angles (typically similar order of magnitude to the number of dates, but you may include slightly fewer or more if justified).

Candidates (BCG categories: star, plow_horse, puzzle; sorted by value):
%s

Return a single JSON object with exactly this shape (double quotes, no trailing commentary):
{
  "selected_menu_names": ["<exact menu name>", "..."]
}

Rules:
- Every name MUST be copied exactly from the candidate list (menu column).
- Prefer a mix aligned with: star ≈ 60–70%% of selected items, puzzle ≈ 20–30%%, plow_horse ≤ 10%% (approximate).
- Carousels (2–4 dishes in one post) may ONLY group puzzle and/or plow_horse items — never stars. Therefore, whenever the candidate list includes puzzle or plow_horse dishes, include enough of them (at least 2 combined if available) so the next step can assign carousel posts. If you only select stars, every post must be single format.
- Do not invent dishes that are not in the list.`,
		strings.TrimSpace(brief.CampaignTheme),
		strings.TrimSpace(brief.Tone),
		strings.TrimSpace(brief.TargetAudience),
		slotCount,
		itemsBlock,
	)
}

func buildSelectPromotionReflectionSnapshot(brief *graphql.CampaignBrief, slotCount int, itemsBlock string) string {
	s := itemsBlock
	if len(s) > 600 {
		s = s[:600] + "…"
	}
	return fmt.Sprintf("Campaign theme: %s\nPosting dates count: %d\nCandidates excerpt:\n%s",
		strings.TrimSpace(brief.CampaignTheme), slotCount, s)
}

func buildSelectPromotionReflectionUser(snapshot, draft string) string {
	return snapshot + `

Generated JSON to review:
` + draft + `

Evaluate against every criterion below. If ALL criteria are met, respond with exactly:
PASS

If ANY criterion fails, respond with:
IMPROVE:
- <specific issue 1>
- <specific issue 2>

Criteria:
1. Valid JSON with exactly the key selected_menu_names (array of strings)
2. Every name appears verbatim in the original candidate list
3. selected_menu_names is non-empty
4. Rough BCG mix: star ≈ 60–70%, puzzle ≈ 20–30%, plow_horse ≤ 10% of selected items (approximate)
5. If the candidate list contains at least two non-star items (puzzle, plow_horse, low_end, etc.), the selection must include at least two non-star items so carousel posts are possible; if only stars exist in candidates, this criterion is N/A
6. Selection aligns with the campaign theme and is suitable for Instagram`
}

func buildSelectPromotionRevisionPrompt(originalGenerationPrompt, previousDraft, feedback string) string {
	return fmt.Sprintf(`You are a senior restaurant marketer. Revise the JSON selection based on reviewer feedback.

%s

---
Previous draft (valid JSON only):
%s

Reviewer feedback — address every point:
%s

Write the improved JSON object now, with the same key as specified in the original task.`,
		originalGenerationPrompt,
		previousDraft,
		feedback,
	)
}

func resolveSelectedMenuNames(payload llmSelectedMenuNames, candidates []graphql.MenuEngineeringItem) ([]graphql.MenuEngineeringItem, error) {
	if len(payload.SelectedMenuNames) == 0 {
		return nil, fmt.Errorf("selected_menu_names must be non-empty")
	}
	byName := map[string]graphql.MenuEngineeringItem{}
	for _, it := range candidates {
		n := strings.TrimSpace(it.Menu)
		if n != "" {
			byName[n] = it
		}
	}
	var out []graphql.MenuEngineeringItem
	for _, name := range payload.SelectedMenuNames {
		n := strings.TrimSpace(name)
		if n == "" {
			continue
		}
		it, ok := byName[n]
		if !ok {
			return nil, fmt.Errorf("unknown menu name %q (must match candidate list)", n)
		}
		out = append(out, it)
	}
	if len(out) == 0 {
		return nil, fmt.Errorf("no valid menu names after resolution")
	}
	return out, nil
}

// ensureNonStarCarouselCandidates appends high-value non-star dishes from the matrix when the LLM
// picked only stars but the menu has carousel-eligible items — otherwise assign_post_formats can only output singles.
func ensureNonStarCarouselCandidates(selected []graphql.MenuEngineeringItem, raw []graphql.MenuEngineeringItem) []graphql.MenuEngineeringItem {
	rawNonStar := make([]graphql.MenuEngineeringItem, 0, len(raw))
	for _, it := range raw {
		if strings.TrimSpace(it.Menu) == "" {
			continue
		}
		if isStarCategory(it.Category) {
			continue
		}
		rawNonStar = append(rawNonStar, it)
	}
	if len(rawNonStar) < 2 {
		return selected
	}
	selectedSet := map[string]struct{}{}
	nonStarInSelected := 0
	for _, it := range selected {
		n := strings.TrimSpace(it.Menu)
		if n == "" {
			continue
		}
		selectedSet[n] = struct{}{}
		if !isStarCategory(it.Category) {
			nonStarInSelected++
		}
	}
	if nonStarInSelected >= 2 {
		return selected
	}
	need := 2 - nonStarInSelected
	sort.Slice(rawNonStar, func(i, j int) bool {
		return rawNonStar[i].WeValue > rawNonStar[j].WeValue
	})
	for _, it := range rawNonStar {
		if need <= 0 {
			break
		}
		n := strings.TrimSpace(it.Menu)
		if _, ok := selectedSet[n]; ok {
			continue
		}
		selected = append(selected, it)
		selectedSet[n] = struct{}{}
		need--
	}
	return selected
}

func isStarCategory(cat string) bool {
	return strings.EqualFold(strings.TrimSpace(cat), "star")
}
