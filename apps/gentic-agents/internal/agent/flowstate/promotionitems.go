package flowstate

import (
	"fmt"
	"sort"
	"strings"

	"github.com/daniel-dihardja/gentic-agents/internal/platform/graphql"
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
)

// PromotionMatrixCategories matches Python ig_campaign _PROMOTION_CATEGORIES.
var PromotionMatrixCategories = []string{"star", "plow_horse", "puzzle"}

// PromotionItemsFromMetadata retrieves the fetched promotion items from state.
func PromotionItemsFromMetadata(state *gen.State) ([]graphql.MenuEngineeringItem, bool) {
	if state == nil {
		return nil, false
	}
	v, ok := state.GetMetadata(KeyPromotionItems)
	if !ok {
		return nil, false
	}
	sl, ok := v.([]graphql.MenuEngineeringItem)
	if !ok || sl == nil {
		return nil, false
	}
	return sl, true
}

// HasFetchedPromotionItems checks if the promotion items fetch has run (including empty result).
func HasFetchedPromotionItems(state *gen.State) bool {
	if state == nil {
		return false
	}
	_, ok := state.GetMetadata(KeyPromotionItems)
	return ok
}

// SelectedPromotionItemsFromMetadata retrieves the selected (shortlisted) promotion items from state.
func SelectedPromotionItemsFromMetadata(state *gen.State) ([]graphql.MenuEngineeringItem, bool) {
	if state == nil {
		return nil, false
	}
	v, ok := state.GetMetadata(KeySelectedPromotionItems)
	if !ok {
		return nil, false
	}
	sl, ok := v.([]graphql.MenuEngineeringItem)
	if !ok {
		return nil, false
	}
	return sl, true
}

// HasSelectedPromotionItems checks if selection has run (including when the shortlist is empty).
func HasSelectedPromotionItems(state *gen.State) bool {
	if state == nil {
		return false
	}
	_, ok := state.GetMetadata(KeySelectedPromotionItems)
	return ok
}

// SortItemsByPriority sorts items by contribution margin × quantity (descending).
func SortItemsByPriority(items []graphql.MenuEngineeringItem) []graphql.MenuEngineeringItem {
	if len(items) < 2 {
		return items
	}
	out := make([]graphql.MenuEngineeringItem, len(items))
	copy(out, items)
	sort.Slice(out, func(i, j int) bool {
		pi := float64(out[i].ContributionMargin) * float64(out[i].Quantity)
		pj := float64(out[j].ContributionMargin) * float64(out[j].Quantity)
		return pi > pj
	})
	return out
}

// FormatItemsForPrompt formats a list of promotion items for inclusion in LLM prompts.
func FormatItemsForPrompt(items []graphql.MenuEngineeringItem) string {
	if len(items) == 0 {
		return "None available"
	}
	var b strings.Builder
	for _, item := range SortItemsByPriority(items) {
		name := strings.TrimSpace(item.Menu)
		if name == "" {
			continue
		}
		detail := ""
		if item.MenuCategoryDetail != nil && strings.TrimSpace(*item.MenuCategoryDetail) != "" {
			detail = " · " + strings.TrimSpace(*item.MenuCategoryDetail)
		}
		qtyStr := ""
		if item.Quantity != 0 {
			qtyStr = fmt.Sprintf(" · qty: %d", item.Quantity)
		}
		cmStr := ""
		if item.ContributionMargin != 0 {
			cmStr = fmt.Sprintf(" · CM: %.2f", item.ContributionMargin)
		}
		fmt.Fprintf(&b, "- %s (category: %s%s%s%s)\n", name, item.Category, detail, qtyStr, cmStr)
	}
	s := strings.TrimSpace(b.String())
	if s == "" {
		return "None available"
	}
	return s
}
