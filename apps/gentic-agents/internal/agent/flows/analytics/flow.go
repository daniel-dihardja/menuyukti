package analytics

import gen "github.com/daniel-dihardja/gentic/pkg/gentic"

// NewFlow builds the analytics pipeline: fetch GraphQL data, then one structured LLM call.
func NewFlow(model, graphqlEndpoint string) gen.Flow {
	return gen.NewFlow(
		FetchStep{GraphQLEndpoint: graphqlEndpoint},
		AnalyzeStep{Model: model},
	)
}
