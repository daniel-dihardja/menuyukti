# Campaign Brief Runtime Validation Checklist

Use this checklist when verifying `brand_brief` milestone generation quality.

## Scenario A: Normal analytics available

1. Create a milestone from the `restaurant_brand_brief` preset and run Generate.
2. Confirm saved Data is valid JSON with keys:
   - `venueSnapshot`
   - `contentPillars`
   - `audienceHypotheses`
   - `proofOrientedAngles`
   - `toneGuardrails`
3. Confirm each list field contains 3-5 unique non-empty items.
4. Confirm entries are evidence-grounded (operating profile, category mix, top items) and avoid invented demographics or claims.
5. Confirm no campaign date fields appear (`startDate`, `endDate`, or inferred campaign window text).

## Scenario B: Partial analytics available

1. Re-run with only part of operating/category signals available.
2. Confirm output still contains all required keys and 3-5 list items per array.
3. Confirm statements are conservative and only reference available signals.
4. Confirm missing signals are disclosed instead of hallucinated.

## Scenario C: No analytics run available

1. Re-run where analytics are unavailable in `get_location_profile`.
2. Confirm `venueSnapshot` is still filled from location identity when present.
3. Confirm list fields still contain 3-5 non-empty items and include conservative placeholder language (for example, `Operating signals unavailable from analytics.`).
4. Confirm no invented precision, competitor claims, or campaign dates.

## Evaluation stability check

1. Trigger milestone evaluation after each scenario run.
2. Confirm pass/fail outcomes align with criteria wording in `apps/web/messages/en.json`.
3. Re-run with identical inputs and verify criterion statuses remain stable.
