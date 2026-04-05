package promotioncandidates

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/daniel-dihardja/gentic-agents/internal/agent/flowstate"
	"github.com/daniel-dihardja/gentic-agents/internal/platform/graphql"
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
	"github.com/daniel-dihardja/gentic/pkg/providers/openai"
)

const analyticsSystemPrompt = `You are a restaurant data analyst for marketing insights only.

You are given menu engineering matrix rows (BCG-style categories: star, plow_horse, puzzle, low_end) and per-item weekly heatmaps (day codes: mon, tue, wed, thu, fri, sat, sun with quantities).

When a **Campaign brief** section appears in the user message, use it to prioritize which items you include in each list and to interpret **day_patterns** in line with that campaign's theme, tone, target audience, and posting cadence. You must still ground every menu item name in the matrix or heatmaps—never invent names.

Produce insights only:
- stars, plow_horses, puzzles: lists of menu item names (strings) grounded in the matrix categories. Prefer notable or representative items; you may omit crowded tails.
- day_patterns: keys are lowercase English weekday names (monday, tuesday, wednesday, thursday, friday, saturday, sunday). Values are menu item names that meaningfully peak or concentrate demand on that weekday according to the heatmaps (relative to that item's week or to other items).

Do not invent menu names. Do not write social posts, captions, or campaign recommendations.`

// AnalyzeStep runs a single structured LLM call over fetched matrix + heatmap data.
type AnalyzeStep struct {
	Model string
}

// Run implements gen.Step.
func (s AnalyzeStep) Run(ctx context.Context, state *gen.State) error {
	if _, ok := state.GetMetadata(flowstate.KeyAnalyticsInsights); ok {
		return nil
	}

	if _, _, err := flowstate.RequiredLocationIDs(state, "analytics insights"); err != nil {
		state.Output = err.Error()
		return nil
	}

	items, ok := flowstate.MatrixItemsFromMetadata(state)
	if !ok {
		state.Output = "Cannot compute analytics: menu engineering data was not loaded."
		return nil
	}
	heatmaps, ok := flowstate.HeatmapsFromMetadata(state)
	if !ok {
		state.Output = "Cannot compute analytics: heatmap data was not loaded."
		return nil
	}

	n := gen.NotifierFromContext(ctx)
	n.Notify("analytics_insights", gen.ActivityRunning, "Derive analytics insights")

	model := strings.TrimSpace(s.Model)
	if model == "" {
		model = openai.DefaultModel
	}

	llm := openai.Provider{}
	var brief *graphql.CampaignBrief
	if b, ok := flowstate.CampaignBriefFromMetadata(state); ok && b != nil {
		brief = b
	}
	user := buildAnalyticsUserPrompt(items, heatmaps, brief)

	insights, err := gen.TypedChat[flowstate.AnalyticsInsights](ctx, llm, model, analyticsSystemPrompt, user)
	if err != nil {
		return fmt.Errorf("analytics insights: %w", err)
	}

	state.SetMetadata(flowstate.KeyAnalyticsInsights, insights)

	out, err := json.MarshalIndent(insights, "", "  ")
	if err != nil {
		return fmt.Errorf("analytics insights: marshal: %w", err)
	}
	state.Output = string(out)

	n.Notify("analytics_insights", gen.ActivityDone, "Analytics insights ready")
	return nil
}

func buildAnalyticsUserPrompt(items []graphql.MenuEngineeringItem, heatmaps []graphql.MenuHeatmap, brief *graphql.CampaignBrief) string {
	var b strings.Builder
	if brief != nil && strings.TrimSpace(brief.CampaignTheme) != "" {
		b.WriteString("## Campaign brief (strategy—use only menu names from the data below)\n\n")
		fmt.Fprintf(&b, "- campaign_theme: %s\n", strings.TrimSpace(brief.CampaignTheme))
		fmt.Fprintf(&b, "- tone: %s\n", strings.TrimSpace(brief.Tone))
		fmt.Fprintf(&b, "- target_audience: %s\n", strings.TrimSpace(brief.TargetAudience))
		fmt.Fprintf(&b, "- posting_cadence: %s\n", strings.TrimSpace(brief.PostingCadence))
		b.WriteString("\n")
	}
	b.WriteString("## Menu engineering matrix (items)\n\n")
	if len(items) == 0 {
		b.WriteString("No matrix rows (missing COGS or no sales in period).\n\n")
	} else {
		for _, it := range items {
			name := strings.TrimSpace(it.Menu)
			if name == "" {
				continue
			}
			fmt.Fprintf(&b, "- %s | category=%s | qty=%d | contributionMargin=%.2f | action=%s\n",
				name, it.Category, it.Quantity, it.ContributionMargin, it.Action)
		}
		b.WriteString("\n")
	}

	b.WriteString("## Menu heatmaps (weekly quantity by day; mon–sun)\n\n")
	if len(heatmaps) == 0 {
		b.WriteString("No heatmap rows.\n")
	} else {
		for _, h := range heatmaps {
			name := strings.TrimSpace(h.Menu)
			if name == "" {
				continue
			}
			fmt.Fprintf(&b, "### %s", name)
			if h.ReportingPeriod != "" {
				fmt.Fprintf(&b, " (period: %s)", h.ReportingPeriod)
			}
			b.WriteString("\n")
			for _, w := range h.WeeklyHeatmap {
				fmt.Fprintf(&b, "  %s: %d\n", w.Day, w.Quantity)
			}
		}
	}

	return strings.TrimSpace(b.String())
}
