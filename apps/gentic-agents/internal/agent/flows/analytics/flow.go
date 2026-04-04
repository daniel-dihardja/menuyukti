package analytics

import gen "github.com/daniel-dihardja/gentic/pkg/gentic"

// NewFlow builds the analytics pipeline: fetch GraphQL data, one structured LLM call, then optional save when campaign_id is set.
func NewFlow(model, graphqlEndpoint string) gen.Flow {
	return gen.NewFlow(
		FetchStep{GraphQLEndpoint: graphqlEndpoint},
		AnalyzeStep{Model: model},
		SavePromotionCandidatesStep{GraphQLEndpoint: graphqlEndpoint},
	)
}
