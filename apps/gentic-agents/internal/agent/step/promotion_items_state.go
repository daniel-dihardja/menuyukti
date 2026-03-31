package step

// This file is deprecated. Use github.com/daniel-dihardja/gentic-agents/internal/agent/flowstate instead.
// Keeping function and variable aliases for backward compatibility during migration.

import (
	fs "github.com/daniel-dihardja/gentic-agents/internal/agent/flowstate"
	"github.com/daniel-dihardja/gentic-agents/internal/platform/graphql"
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
)

// Deprecated: use flowstate.PromotionMatrixCategories
var promotionMatrixCategories = fs.PromotionMatrixCategories

// Deprecated: use flowstate.HasFetchedPromotionItems
func hasFetchedPromotionItems(state *gen.State) bool {
	return fs.HasFetchedPromotionItems(state)
}

// Deprecated: use flowstate.PromotionItemsFromMetadata
func promotionItemsFromMetadata(state *gen.State) ([]graphql.MenuEngineeringItem, bool) {
	return fs.PromotionItemsFromMetadata(state)
}

// Deprecated: use flowstate.HasSelectedPromotionItems
func hasSelectedPromotionItems(state *gen.State) bool {
	return fs.HasSelectedPromotionItems(state)
}

// Deprecated: use flowstate.SelectedPromotionItemsFromMetadata
func selectedPromotionItemsFromMetadata(state *gen.State) ([]graphql.MenuEngineeringItem, bool) {
	return fs.SelectedPromotionItemsFromMetadata(state)
}

// Deprecated: use flowstate.SortItemsByPriority
func sortItemsByPriority(items []graphql.MenuEngineeringItem) []graphql.MenuEngineeringItem {
	return fs.SortItemsByPriority(items)
}

// Deprecated: use flowstate.FormatItemsForPrompt
func formatItemsForPrompt(items []graphql.MenuEngineeringItem) string {
	return fs.FormatItemsForPrompt(items)
}
