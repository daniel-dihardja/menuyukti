package flowstate

// Metadata key constants used across flows
const (
	// KeyUserID is set by the HTTP layer from X-Menuyukti-User-Id for outbound GraphQL X-User-Id
	// when tool code cannot use the request context (e.g. ReAct tools).
	KeyUserID = "_user_id"
	KeyLocationProfile        = "_location_profile"
	KeyCampaignBrief          = "_campaign_brief"
	KeyPostSchedule           = "_post_schedule"
	KeyPostFormatPlan         = "_post_format_plan"
	KeyPromotionItems         = "_promotion_items"
	KeySelectedPromotionItems = "_selected_promotion_items"
)
