# 10. Instagram Post Generation From Scheduler

This feature helps restaurant marketers turn weekly sales insights into practical Instagram posts with minimal manual work.

## Why This Feature Matters

- Marketers get weekly, data-backed post suggestions from sales heatmap and matrix signals.
- Menu analysts can push specific menu goals (combo offers, happy hour, hero items) into market-facing content.
- Teams can move from analysis to publish-ready package in one workflow.

## Where To Find It

- Go to `/analytics/{analyticsId}/scheduler`.
- Open the **Weekly Heatmap Suggestions** section.

## End-to-End Workflow

1. Review weekly suggestions.
- Each suggestion shows menu item, recommended daypart, offer type, confidence, and rationale.

2. Start composition.
- Click **Use Suggestion** to open the prefilled **Post Composer**.
- You can also click **Generate Post** from recommendation candidates.

3. Edit post copy.
- Choose caption variant.
- Adjust CTA.
- Update hashtags.
- Adjust scheduled datetime if needed.

4. Apply to schedule.
- Click **Apply To Schedule** to add the prepared post as a scheduler entry.

5. Save week plan.
- Click **Save Draft** in scheduler to persist week entries.

6. Export publish package.
- In composer, click **Export Package** to download a JSON package for manual Instagram publishing handoff.

## Guardrails and Validation

Composer guardrails run before applying to schedule:

- `CAPTION_REQUIRED` (blocked)
- `CAPTION_TOO_LONG` (blocked)
- `CTA_REQUIRED` (blocked)
- `HASHTAG_MISSING` (warning)
- `HASHTAG_TOO_MANY` (warning)

Behavior:
- Blocked issues stop apply action.
- Warnings allow apply but are shown in UI message.

## How Suggestions Are Generated

Suggestion ranking is deterministic:

- Primary input: heatmap demand by menu/daypart.
- Secondary input: matrix action and margin context.
- Fallback: if heatmap is unavailable, matrix action candidates are used.

This gives stable results for the same input data and avoids random recommendations.

## Value by Persona

Restaurant Marketer value:
- Faster weekly posting plan creation.
- Data-backed rationale for what to post and when.
- Lower content preparation effort with prefilled copy.

Menu Analyst value:
- Converts menu optimization insights into campaign-ready actions.
- Connects promote/reprice priorities directly to weekly execution.
- Supports consistent promotion framing for combo/happy-hour/hero scenarios.

## Troubleshooting

- No weekly suggestions shown:
  - Check if analytics has heatmap/matrix outputs.
  - Ensure selected week is valid for the analytics context.

- Composer does not apply:
  - Check blocked guardrail codes in the status message.

- Export package missing:
  - Reopen composer from a suggestion/recommendation and export again.
