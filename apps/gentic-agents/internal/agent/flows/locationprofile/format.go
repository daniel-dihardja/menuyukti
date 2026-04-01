package locationprofile

import (
	"fmt"
	"strings"

	"github.com/daniel-dihardja/gentic-agents/internal/platform/graphql"
)

func nullableStr(s string) string {
	if strings.TrimSpace(s) == "" {
		return "N/A"
	}
	return s
}

func joinOrNA(parts []string) string {
	if len(parts) == 0 {
		return "N/A"
	}
	return strings.Join(parts, ", ")
}

func formatMealPeriodLines(rows []graphql.MealPeriodBreakdownRow) string {
	if len(rows) == 0 {
		return "  N/A"
	}
	var b strings.Builder
	for _, p := range rows {
		label := p.Label
		if label == "" {
			label = p.Period
		}
		avgTicket := 0.0
		if p.OrderCount > 0 {
			avgTicket = p.Revenue / float64(p.OrderCount)
		}
		fmt.Fprintf(&b, "  %s: %.0f%% of orders, %.0f%% of revenue, avg ticket %.2f\n",
			label, p.Share*100, p.RevenueShare*100, avgTicket)
	}
	return strings.TrimSuffix(b.String(), "\n")
}

func formatDayOfWeekLines(rows []graphql.DayOfWeekBreakdownRow) string {
	if len(rows) == 0 {
		return "  N/A"
	}
	var b strings.Builder
	for _, d := range rows {
		peak := ""
		if d.IsPeakDay {
			peak = ", peak day"
		}
		fmt.Fprintf(&b, "  %s: %.0f%% of orders, %.0f%% of revenue%s\n",
			d.Day, d.Share*100, d.Share*100, peak)
	}
	return strings.TrimSuffix(b.String(), "\n")
}

func formatDayTypeLines(rows []graphql.DayTypeBreakdownRow) string {
	if len(rows) == 0 {
		return "  N/A"
	}
	var b strings.Builder
	for _, t := range rows {
		fmt.Fprintf(&b, "  %s: %.0f%% of orders, %.0f%% of revenue\n",
			t.Type, t.Share*100, t.RevenueShare*100)
	}
	return strings.TrimSuffix(b.String(), "\n")
}
