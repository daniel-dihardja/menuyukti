package campaign

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"

	"github.com/daniel-dihardja/gentic-agents/internal/agent/flowstate"
	"github.com/daniel-dihardja/gentic-agents/internal/agent/step"
	"github.com/daniel-dihardja/gentic-agents/internal/platform/graphql"
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
)

// FetchBriefInput has no parameters; campaign_id comes from the request metadata.
type FetchBriefInput struct{}

// CreateBriefInput has no parameters; location profile and ids come from the request context.
type CreateBriefInput struct{}

// UpdateBriefInput is the input to update_campaign_brief (all four fields required).
type UpdateBriefInput struct {
	CampaignTheme  string `json:"campaign_theme" schema:"required"`
	Tone           string `json:"tone" schema:"required"`
	TargetAudience string `json:"target_audience" schema:"required"`
	PostingCadence string `json:"posting_cadence" schema:"required"`
}

func fetchBriefHandler(endpoint string) func(context.Context, *gen.State, json.RawMessage) (json.RawMessage, error) {
	return func(ctx context.Context, state *gen.State, _ json.RawMessage) (json.RawMessage, error) {
		campaignID := flowstate.CampaignIDFromMetadata(state)
		if campaignID == "" {
			slog.Warn("campaign tool: fetch_campaign_brief missing campaign_id",
				"component", "gentic-agents.campaign")
			return nil, fmt.Errorf("campaign_id is required in the request")
		}
		ctx = graphql.GraphQLContext(ctx, state)
		brief, err := graphql.FetchCampaignBrief(ctx, endpoint, campaignID)
		if err != nil {
			slog.Error("campaign tool: fetch_campaign_brief graphql error",
				"component", "gentic-agents.campaign",
				"campaign_id", campaignID, "err", err)
			return nil, err
		}
		if brief == nil || strings.TrimSpace(brief.CampaignTheme) == "" {
			state.DeleteMetadata(flowstate.KeyCampaignBrief)
			return json.Marshal(map[string]interface{}{
				"exists": false,
				"id":     "",
			})
		}
		state.SetMetadata(flowstate.KeyCampaignBrief, brief)
		slog.Info("campaign tool: fetch_campaign_brief ok",
			"component", "gentic-agents.campaign",
			"campaign_id", campaignID,
			"brief_id", string(brief.ID))
		return json.Marshal(map[string]interface{}{
			"exists":          true,
			"id":              string(brief.ID),
			"campaign_theme":  brief.CampaignTheme,
			"tone":            brief.Tone,
			"target_audience": brief.TargetAudience,
			"posting_cadence": brief.PostingCadence,
		})
	}
}

func createBriefHandler(endpoint, model string, maxReflectionIterations int) func(context.Context, *gen.State, json.RawMessage) (json.RawMessage, error) {
	s := CreateBriefStep{
		Model:                   model,
		MaxReflectionIterations: maxReflectionIterations,
	}
	return func(ctx context.Context, state *gen.State, _ json.RawMessage) (json.RawMessage, error) {
		state.DeleteMetadata(flowstate.KeyCampaignBrief)
		ctx = graphql.GraphQLContext(ctx, state)
		// Lazy-load location profile into working memory if not already present.
		// Mirrors locationprofile.CheckStep but inline so the tool is self-sufficient.
		if !flowstate.HasValidPersistedLocationProfile(state) {
			if locationID, analyticsID, ok := flowstate.RequiredLocationIDs(state, "load location profile"); ok {
				if profile, err := graphql.FetchLocationProfile(ctx, endpoint, locationID, analyticsID); err == nil && profile != nil {
					state.SetMetadata(flowstate.KeyLocationProfile, profile)
				}
			}
		}
		if err := s.Run(ctx, state); err != nil {
			return nil, err
		}
		brief, ok := flowstate.CampaignBriefFromMetadata(state)
		if !ok || brief == nil || strings.TrimSpace(brief.CampaignTheme) == "" {
			msg := strings.TrimSpace(state.Output)
			if msg == "" {
				msg = "Could not create campaign brief."
			}
			return json.Marshal(map[string]interface{}{
				"created": false,
				"error":   msg,
			})
		}

		campaignID := flowstate.CampaignIDFromMetadata(state)
		if campaignID == "" {
			return nil, fmt.Errorf("campaign_id is required in the request to save the brief")
		}
		locationID, analyticsID, ok := flowstate.RequiredLocationIDs(state, "save campaign brief")
		if !ok {
			return nil, fmt.Errorf("%s", state.Output)
		}

		err := graphql.SaveCampaignBrief(ctx, endpoint, campaignID, locationID, analyticsID,
			strings.TrimSpace(brief.CampaignTheme),
			strings.TrimSpace(brief.Tone),
			strings.TrimSpace(brief.TargetAudience),
			strings.TrimSpace(brief.PostingCadence),
			nil,
		)
		if err != nil {
			slog.Error("campaign tool: create_campaign_brief save failed",
				"component", "gentic-agents.campaign",
				"campaign_id", campaignID, "err", err)
			return nil, err
		}

		row, err := graphql.FetchCampaignBrief(ctx, endpoint, campaignID)
		if err != nil {
			return nil, err
		}
		if row != nil {
			state.SetMetadata(flowstate.KeyCampaignBrief, row)
		}

		step.EmitPlanningProgress(ctx, state)

		n := gen.NotifierFromContext(ctx)
		if n != nil {
			n.EmitData("campaign_brief_update", map[string]string{
				"campaign_theme":  strings.TrimSpace(brief.CampaignTheme),
				"tone":            strings.TrimSpace(brief.Tone),
				"target_audience": strings.TrimSpace(brief.TargetAudience),
				"posting_cadence": strings.TrimSpace(brief.PostingCadence),
			})
		}

		savedID := campaignID
		if row != nil && row.ID != "" {
			savedID = string(row.ID)
		}
		slog.Info("campaign tool: create_campaign_brief saved",
			"component", "gentic-agents.campaign",
			"campaign_id", campaignID, "brief_row_id", savedID)

		// CreateBriefStep sets a long state.Output; keep chat short for ReAct.
		state.Output = "Campaign brief saved."

		// Omit full brief body in tool output so the model does not repeat it in chat.
		return json.Marshal(map[string]interface{}{
			"created": true,
			"id":      savedID,
		})
	}
}

func updateBriefHandler(endpoint string) func(context.Context, *gen.State, json.RawMessage) (json.RawMessage, error) {
	return func(ctx context.Context, state *gen.State, input json.RawMessage) (json.RawMessage, error) {
		var params UpdateBriefInput
		if err := json.Unmarshal(input, &params); err != nil {
			return nil, fmt.Errorf("invalid input: %w", err)
		}
		campaignID := flowstate.CampaignIDFromMetadata(state)
		if campaignID == "" {
			slog.Warn("campaign tool: update_campaign_brief missing campaign_id",
				"component", "gentic-agents.campaign")
			return nil, fmt.Errorf("campaign_id is required in the request")
		}
		locationID, analyticsID, ok := flowstate.RequiredLocationIDs(state, "update campaign brief")
		if !ok {
			return nil, fmt.Errorf("%s", state.Output)
		}

		theme := strings.TrimSpace(params.CampaignTheme)
		tone := strings.TrimSpace(params.Tone)
		audience := strings.TrimSpace(params.TargetAudience)
		cadence := strings.TrimSpace(params.PostingCadence)
		if theme == "" {
			return nil, fmt.Errorf("campaign_theme must be non-empty")
		}

		ctx = graphql.GraphQLContext(ctx, state)
		slog.Info("campaign tool: update_campaign_brief saving",
			"component", "gentic-agents.campaign",
			"campaign_id", campaignID, "theme_len", len(theme))

		err := graphql.SaveCampaignBrief(ctx, endpoint, campaignID, locationID, analyticsID,
			theme, tone, audience, cadence, nil)
		if err != nil {
			slog.Error("campaign tool: update_campaign_brief save failed",
				"component", "gentic-agents.campaign",
				"campaign_id", campaignID, "err", err)
			return nil, err
		}

		row, err := graphql.FetchCampaignBrief(ctx, endpoint, campaignID)
		if err != nil {
			return nil, err
		}
		if row != nil {
			state.SetMetadata(flowstate.KeyCampaignBrief, row)
		} else {
			state.SetMetadata(flowstate.KeyCampaignBrief, &graphql.CampaignBrief{
				CampaignID:     graphql.ID(campaignID),
				LocationID:     graphql.ID(locationID),
				AnalyticsRunID: graphql.ID(analyticsID),
				CampaignTheme:  theme,
				Tone:           tone,
				TargetAudience: audience,
				PostingCadence: cadence,
			})
		}

		step.EmitPlanningProgress(ctx, state)

		n := gen.NotifierFromContext(ctx)
		if n != nil {
			n.EmitData("campaign_brief_update", map[string]string{
				"campaign_theme":  theme,
				"tone":            tone,
				"target_audience": audience,
				"posting_cadence": cadence,
			})
		}

		savedID := campaignID
		if row != nil && row.ID != "" {
			savedID = string(row.ID)
		}
		slog.Info("campaign tool: update_campaign_brief saved",
			"component", "gentic-agents.campaign",
			"campaign_id", campaignID, "brief_row_id", savedID)

		state.Output = "Campaign brief updated."

		return json.Marshal(map[string]interface{}{
			"updated": true,
			"id":      savedID,
		})
	}
}
