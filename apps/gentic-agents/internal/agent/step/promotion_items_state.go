package step

import (
	"fmt"
	"sort"
	"strings"

	"github.com/daniel-dihardja/gentic-agents/internal/platform/graphql"
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
)

const (
	metadataKeyPromotionItems        = "_promotion_items"
	metadataKeySelectedPromotionItems = "_selected_promotion_items"
)

// promotionMatrixCategories matches Python ig_campaign _PROMOTION_CATEGORIES.
var promotionMatrixCategories = []string{"star", "plow_horse", "puzzle"}

// hasFetchedPromotionItems is true after the matrix fetch has run (including empty result).
func hasFetchedPromotionItems(state *gen.State) bool {
	if state == nil {
		return false
	}
	_, ok := state.GetMetadata(metadataKeyPromotionItems)
	return ok
}

func promotionItemsFromMetadata(state *gen.State) ([]graphql.MenuEngineeringItem, bool) {
	if state == nil {
		return nil, false
	}
	v, ok := state.GetMetadata(metadataKeyPromotionItems)
	if !ok {
		return nil, false
	}
	sl, ok := v.([]graphql.MenuEngineeringItem)
	if !ok || sl == nil {
		return nil, false
	}
	return sl, true
}

// hasSelectedPromotionItems is true after selection has run, including when the shortlist is empty.
func hasSelectedPromotionItems(state *gen.State) bool {
	if state == nil {
		return false
	}
	_, ok := state.GetMetadata(metadataKeySelectedPromotionItems)
	return ok
}

func selectedPromotionItemsFromMetadata(state *gen.State) ([]graphql.MenuEngineeringItem, bool) {
	if state == nil {
		return nil, false
	}
	v, ok := state.GetMetadata(metadataKeySelectedPromotionItems)
	if !ok {
		return nil, false
	}
	sl, ok := v.([]graphql.MenuEngineeringItem)
	if !ok {
		return nil, false
	}
	return sl, true
}

func sortItemsByPriority(items []graphql.MenuEngineeringItem) []graphql.MenuEngineeringItem {
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

func formatItemsForPrompt(items []graphql.MenuEngineeringItem) string {
	if len(items) == 0 {
		return "None available"
	}
	var b strings.Builder
	for _, item := range sortItemsByPriority(items) {
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
