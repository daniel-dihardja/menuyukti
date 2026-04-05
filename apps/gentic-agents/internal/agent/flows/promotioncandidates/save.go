package promotioncandidates

import (
	"github.com/daniel-dihardja/gentic-agents/internal/agent/flowstate"
	"github.com/daniel-dihardja/gentic-agents/internal/platform/graphql"
)

// promotionCandidatesPayload is the JSON stored on the campaign (insights + source matrix rows).
type promotionCandidatesPayload struct {
	Insights    flowstate.AnalyticsInsights   `json:"insights"`
	MatrixItems []graphql.MenuEngineeringItem `json:"matrix_items"`
}
