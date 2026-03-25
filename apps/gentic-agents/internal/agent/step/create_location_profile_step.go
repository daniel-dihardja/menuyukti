package step

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/daniel-dihardja/gentic-agents/internal/platform/graphql"
	gen "github.com/daniel-dihardja/gentic/pkg/gentic"
	"github.com/daniel-dihardja/gentic/pkg/providers/openai"
)

const (
	metadataKeyLocationProfile = "_location_profile"
	generationSystemPrompt     = "You are a senior restaurant marketing strategist. Follow the instructions precisely."
	reflectionSystemPrefix     = "You are a quality reviewer for restaurant Instagram marketing briefs."
	profileCreatedNotifySystem = "You are a helpful assistant for restaurant and menu planning. Write concise, clear, friendly messages for users."
)

// CreateLocationProfileStep generates and persists a location profile when none exists (after CheckLocationProfileStep).
type CreateLocationProfileStep struct {
	GraphQLEndpoint         string
	Model                   string
	MaxReflectionIterations int
}

// Run implements gentic.Step.
func (s CreateLocationProfileStep) Run(state *gen.State) error {
	if state.Metadata == nil {
		state.Metadata = make(map[string]interface{})
	}

	if v, ok := state.Metadata[metadataKeyLocationProfile]; ok {
		if p, ok := v.(*graphql.LocationProfile); ok && p != nil && strings.TrimSpace(p.Summary) != "" {
			state.Output = fmt.Sprintf(
				"A location profile exists (id=%s). Summary: %s",
				string(p.ID),
				p.Summary,
			)
			return nil
		}
	}

	meta := state.SecureMetadata()
	locVal, okLoc := meta.Get("location_id")
	anaVal, okAna := meta.Get("analytics_id")
	if !okLoc || !okAna {
		state.Output = "Cannot create location profile: location_id and analytics_id are required in the request."
		return nil
	}

	locationID, err := formatID(locVal)
	if err != nil {
		state.Output = fmt.Sprintf("Invalid location_id: %v", err)
		return nil
	}
	analyticsID, err := formatID(anaVal)
	if err != nil {
		state.Output = fmt.Sprintf("Invalid analytics_id: %v", err)
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	loc, op, err := graphql.FetchLocationData(ctx, s.GraphQLEndpoint, locationID, analyticsID)
	if err != nil {
		return err
	}
	if loc == nil || strings.TrimSpace(loc.Name) == "" {
		state.Output = "Cannot create location profile: location data could not be loaded."
		return nil
	}

	llm := openai.Provider{}
	model := s.Model
	if model == "" {
		model = openai.DefaultModel
	}

	var summary string

	if op != nil {
		genPrompt := buildOperatingDataLocationSummaryPrompt(loc, op)
		refSnap := buildReflectionSnapshot(loc, op)
		summary, err = runReflectLoop(llm, model, s.MaxReflectionIterations, genPrompt, refSnap)
		if err != nil {
			return err
		}
	} else {
		summary, err = llm.Chat(model, generationSystemPrompt, buildInferenceOnlyLocationSummaryPrompt(loc))
		if err != nil {
			return err
		}
	}

	if err := graphql.SaveLocationProfile(ctx, s.GraphQLEndpoint, locationID, analyticsID, summary); err != nil {
		return err
	}
	if analyticsID != "0" {
		_ = graphql.SaveLocationProfile(ctx, s.GraphQLEndpoint, locationID, "0", summary)
	}

	notify, err := llm.Chat(model, profileCreatedNotifySystem, buildProfileCreatedNotificationUserPrompt(loc))
	if err != nil {
		notify = fallbackProfileCreatedMessage(loc)
	} else {
		notify = strings.TrimSpace(notify)
		if notify == "" {
			notify = fallbackProfileCreatedMessage(loc)
		}
	}

	state.Output = notify + "\n\n" + summary
	return nil
}

func buildProfileCreatedNotificationUserPrompt(loc *graphql.Location) string {
	name := loc.Name
	if name == "" {
		name = "this restaurant"
	}
	city := loc.City
	if city == "" {
		city = "unknown city"
	}
	country := loc.Country
	if country == "" {
		country = "unknown country"
	}
	addr := strings.TrimSpace(loc.Street)
	venue := fmt.Sprintf("%s — %s, %s", name, city, country)
	if addr != "" {
		venue += fmt.Sprintf(" (%s)", addr)
	}
	return fmt.Sprintf(`A new Instagram-oriented marketing location profile was just generated for this venue and saved to the database:

%s

Write 2–4 short sentences addressed to the user confirming that their profile is ready and saved. Explain briefly what kind of marketing brief it is (venue positioning, audience, timing, tone). Do not paste or repeat the full profile text in your reply — only the confirmation and framing.`,
		venue)
}

func fallbackProfileCreatedMessage(loc *graphql.Location) string {
	name := loc.Name
	if name == "" {
		name = "this venue"
	}
	return fmt.Sprintf("Your new location marketing profile for %s has been created and saved. The full profile is below.", name)
}

// buildInferenceOnlyLocationSummaryPrompt builds the user prompt when there is no operating profile:
// name, address, and city/country only (inference defaults; matches legacy Python _LOCATION_SUMMARY_LITE_PROMPT).
func buildInferenceOnlyLocationSummaryPrompt(loc *graphql.Location) string {
	name := loc.Name
	if name == "" {
		name = "this restaurant"
	}
	city := loc.City
	if city == "" {
		city = "unknown city"
	}
	country := loc.Country
	if country == "" {
		country = "unknown country"
	}
	addr := strings.TrimSpace(loc.Street)

	header := fmt.Sprintf("Restaurant name: %s\nLocation: %s, %s", name, city, country)
	if addr != "" {
		header += fmt.Sprintf("\nAddress: %s", addr)
	}

	intro := fmt.Sprintf(`You are a senior restaurant marketing strategist helping build an Instagram content strategy.

You have no sales or operating data for this restaurant. Using only the venue name and location, infer reasonable defaults for a restaurant of this type in %s, %s. Do not invent specific facts; draw only on what can be reasonably assumed for the market and city. Clearly note where you are making assumptions.`,
		city, country)

	return strings.TrimSpace(intro + "\n\n" + locationSummaryInferenceSections + "\n\n" + header)
}

// locationSummaryInferenceSections is the four-section structure for inference-only summaries (no sales data).
const locationSummaryInferenceSections = `

Structure your response as exactly four labelled paragraphs:

**Venue Identity**
What kind of place is this likely to be, and how should it position itself on Instagram? Infer the probable venue type, price point, and content positioning from the name and city context.

**Audience Persona**
Who is the likely customer, and what content resonates with them? Draw on the city and restaurant name to infer the most plausible demographic and social context (e.g. urban professionals, families, students, tourists). Suggest content themes that typically resonate with this audience.

**Traffic & Timing**
When does a restaurant of this type in this city likely peak? Suggest a probable primary meal period and recommended Instagram posting window (post 1–2 hours before the peak meal period to capture consideration). Note that these are informed defaults — actual data would refine these recommendations.

**Content & Tone Signals**
What visual aesthetic and brand voice is most likely appropriate? Derive direction from the city, probable cuisine type, and price positioning inferred from the name. Call out one or two specific content angles likely to perform well.`

// buildOperatingDataLocationSummaryPrompt builds the user prompt from location + operating profile (matches legacy _LOCATION_SUMMARY_PROMPT).
func buildOperatingDataLocationSummaryPrompt(loc *graphql.Location, op *graphql.OperatingProfile) string {
	name := loc.Name
	if name == "" {
		name = "this restaurant"
	}
	city := loc.City
	if city == "" {
		city = "unknown city"
	}
	country := loc.Country
	if country == "" {
		country = "unknown country"
	}
	addr := strings.TrimSpace(loc.Street)

	totalOrders := op.TotalOrders
	totalRevenue := op.TotalRevenue
	avgRevPerOrder := 0.0
	if totalOrders > 0 {
		avgRevPerOrder = totalRevenue / float64(totalOrders)
	}

	activeDays := op.ActiveDaysCount
	avgActiveDaysPerWeek := 0.0
	if activeDays > 0 {
		avgActiveDaysPerWeek = float64(activeDays) / 4.33
	}

	menuSummary := "N/A"

	header := fmt.Sprintf("Restaurant name: %s\nLocation: %s, %s", name, city, country)
	if addr != "" {
		header += fmt.Sprintf("\nAddress: %s", addr)
	}

	return fmt.Sprintf(strings.TrimSpace(operatingDataLocationSummaryPromptTemplate),
		header,
		totalOrders,
		totalRevenue,
		activeDays,
		avgActiveDaysPerWeek,
		op.AvgDailyOrders,
		op.AvgOrderSize,
		avgRevPerOrder,
		op.WeekdayShare*100, op.WeekendShare*100, 0.0,
		nullableStr(op.PeakDay),
		nullableStr(op.PeakDay),
		nullableStr(op.PrimaryMealPeriod),
		"N/A",
		joinOrNA(op.ActiveMealPeriods),
		nullableStr(op.OperatingPattern),
		nullableStr(op.DiningFocus),
		menuSummary,
		formatMealPeriodLines(op.MealPeriodBreakdown),
		formatDayOfWeekLines(op.DayOfWeekBreakdown),
		formatDayTypeLines(op.DayTypeBreakdown),
		"  N/A",
		"  N/A",
	)
}

const operatingDataLocationSummaryPromptTemplate = `You are a senior restaurant marketing strategist helping build an Instagram content strategy.

Using the operating data below, write a marketing briefing for the venue. Interpret the data — do not simply repeat it. Translate every signal into a clear implication for Instagram content decisions. Do not invent facts; only draw conclusions the data supports.

Structure your response as exactly four labelled paragraphs:

**Venue Identity**
What kind of place is this, and how should it position itself on Instagram? Derive the venue type and positioning from the dining focus, operating pattern, average spend per order (price-point signal), and dominant menu composition. (e.g. "A mid-range weekday lunch café anchored by a food-led menu with strong coffee trade.")

**Audience Persona**
Who is the likely customer, and what content resonates with them? Infer the social context from average items per order: ≤2 items = solo diners or pairs (content themes: "me time", quick rituals, dates); 3–5 items = small groups or couples (sharing, casual catch-ups); ≥6 items = families or large groups (celebrations, gatherings). Layer in price sensitivity from average spend, and lifestyle from the weekday/weekend split (weekday-heavy = office/commuter crowd; weekend-heavy = leisure diners, families, tourists). Holiday share above 10%% signals holiday-occasion sensitivity worth activating in content.

**Traffic & Timing**
When does this venue peak, and when should posts go live? State the highest-traffic day and highest-revenue day (flag if they differ and why that matters). Translate the primary meal period into a concrete Instagram posting window: post 1–2 hours before the meal period opens to capture consideration (e.g. dinner peak → post mid-afternoon). Note any meaningful weekday/weekend/holiday revenue concentration that should shape the weekly posting cadence.

**Content & Tone Signals**
What visual aesthetic and brand voice should the marketer adopt? Derive aesthetic direction from dining focus and top menu sub-categories (e.g. breakfast café → warm morning light, flat lays, ritual framing; late-night venue → moody, vibrant, nightlife energy). Derive tone from price point: high average spend → aspirational, elevated copy; low-to-mid spend → warm, accessible, everyday language. Call out one or two specific content angles the data supports strongly (e.g. "mid-week lunch promos", "Friday evening countdown posts", "holiday bundle features").

---

%s

Operating profile:
- Total orders: %v
- Total revenue: %v
- Active days: %v
- Average active days per week: %.1f
- Average daily orders: %.1f
- Average items per order: %.1f (proxy for party size and social context)
- Average revenue per order: %.2f (price-point signal)
- Weekday share: %.0f%% | Weekend share: %.0f%% | Holiday share: %.0f%%
- Peak day (by orders): %s | Peak day (by revenue): %s
- Primary meal period (by orders): %s | Peak meal period (by revenue): %s
- Active meal periods: %s
- Operating pattern: %s
- Dining focus: %s
- Menu composition: %s

Meal period breakdown:
%s

Day-of-week breakdown:
%s

Day-type breakdown (weekday / weekend / holiday):
%s

Menu category breakdown (FOOD / DRINK):
%s

Menu sub-category breakdown:
%s`

func buildReflectionSnapshot(loc *graphql.Location, op *graphql.OperatingProfile) string {
	name := loc.Name
	if name == "" {
		name = "this restaurant"
	}
	city := loc.City
	if city == "" {
		city = "unknown city"
	}
	country := loc.Country
	if country == "" {
		country = "unknown country"
	}

	totalOrders := op.TotalOrders
	totalRevenue := op.TotalRevenue
	avgRevPerOrder := 0.0
	if totalOrders > 0 {
		avgRevPerOrder = totalRevenue / float64(totalOrders)
	}

	return fmt.Sprintf(
		"Restaurant: %s (%s, %s)\n\nSource data snapshot:\n"+
			"- Operating pattern: %s  |  Dining focus: %s\n"+
			"- Peak day (by orders): %s  |  Peak day (by revenue): %s\n"+
			"- Primary meal period: %s\n"+
			"- Weekday / weekend split: %.0f%% weekday / %.0f%% weekend\n"+
			"- Average spend per order: %.2f  |  Average items per order: %.1f\n"+
			"- Holiday share: %.0f%%\n",
		name, city, country,
		nullableStr(op.OperatingPattern),
		nullableStr(op.DiningFocus),
		nullableStr(op.PeakDay),
		nullableStr(op.PeakDay),
		nullableStr(op.PrimaryMealPeriod),
		op.WeekdayShare*100,
		op.WeekendShare*100,
		avgRevPerOrder,
		op.AvgOrderSize,
		0.0,
	)
}

func buildReflectionUser(snapshot, draft string) string {
	return snapshot + `

Generated summary to review:
` + draft + `

Evaluate against every criterion below. If ALL criteria are met, respond with exactly:
PASS

If ANY criterion fails, respond with:
IMPROVE:
- <specific issue 1>
- <specific issue 2>
(add more lines as needed)

Criteria:
1. All four sections are present with their exact headings: **Venue Identity**, **Audience Persona**, **Traffic & Timing**, **Content & Tone Signals**

2. Every factual claim is traceable to the source data snapshot above — no invented facts

3. Venue Identity explicitly states a price tier (budget / mid-range / premium) derived from average spend per order, and names the dominant dining focus

4. Audience Persona: (a) applies the party-size heuristic from avg items per order; (b) derives the copy tone from price point

5. Traffic & Timing: (a) states a concrete posting window using the 1–2 hour lead-time rule tied to the primary meal period; (b) notes weekday vs weekend posting cadence implications; (c) if peak order day and peak revenue day differ, flags this

6. Content & Tone Signals names at least two specific content angles, each tied to a concrete data signal

7. If holiday share is above 10%, Audience Persona or Content & Tone Signals explicitly acknowledges holiday-occasion sensitivity`
}

func buildRevisionPrompt(originalGenerationPrompt, previousSummary, feedback string) string {
	return fmt.Sprintf(`You are a senior restaurant marketing strategist. Revise the location summary below based on specific reviewer feedback.

%s

---
Previous draft (to be improved):
%s

Reviewer feedback — address every point:
%s

Write the improved version now, keeping the same four-section structure (**Venue Identity**, **Audience Persona**, **Traffic & Timing**, **Content & Tone Signals**).`,
		originalGenerationPrompt,
		previousSummary,
		feedback,
	)
}

func runReflectLoop(llm gen.LLM, model string, maxIterations int, generationPrompt, reflectionSnapshot string) (string, error) {
	var draft string
	var feedbackBullets []string

	for iteration := 0; iteration <= maxIterations; iteration++ {
		var err error
		if iteration == 0 {
			draft, err = llm.Chat(model, generationSystemPrompt, generationPrompt)
		} else {
			fb := strings.Join(feedbackBullets, "\n")
			draft, err = llm.Chat(model, generationSystemPrompt, buildRevisionPrompt(generationPrompt, draft, fb))
		}
		if err != nil {
			return "", err
		}

		if iteration >= maxIterations {
			return draft, nil
		}

		refUser := buildReflectionUser(reflectionSnapshot, draft)
		raw, err := llm.Chat(model, reflectionSystemPrefix, refUser)
		if err != nil {
			return "", err
		}

		pass, fb := parseReflectionVerdict(raw)
		if pass {
			return draft, nil
		}
		feedbackBullets = fb
		if len(feedbackBullets) == 0 {
			feedbackBullets = []string{strings.TrimSpace(raw)}
		}
	}
	return draft, nil
}

func parseReflectionVerdict(raw string) (pass bool, feedback []string) {
	s := strings.TrimSpace(raw)
	upper := strings.ToUpper(s)
	if upper == "PASS" {
		return true, nil
	}
	if idx := strings.Index(upper, "IMPROVE:"); idx >= 0 {
		prefixLen := idx + len("IMPROVE:")
		if prefixLen > len(s) {
			return false, []string{s}
		}
		rest := strings.TrimSpace(s[prefixLen:])
		for _, line := range strings.Split(rest, "\n") {
			line = strings.TrimSpace(line)
			line = strings.TrimPrefix(line, "-")
			line = strings.TrimSpace(line)
			if line != "" {
				feedback = append(feedback, line)
			}
		}
		return false, feedback
	}
	return false, []string{s}
}

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
		// API does not expose revenueShare per day; show order share for both columns when unavailable.
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
