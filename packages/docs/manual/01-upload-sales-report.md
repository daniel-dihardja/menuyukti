# 01. Upload Sales Report Excel

## What This Feature Is About

This feature ingests your sales Excel file into Menuyukti's ETL pipeline so all analytics pages (matrix, daypart, pair/combo, agents) can run on consistent structured data.

## What You Need Before Upload

- A location already created in `/analytics/locations`.
- A POS export Excel file for that location.
- Correct period scope (for example: one month or one quarter per file).

## How To Use

1. Open `/analytics/sales`.
2. Select the location.
3. Click `Upload New Sales Report` and choose the Excel file.
4. Wait for async processing status:
   - `queued`: accepted, waiting for worker.
   - `running`: ETL is validating and transforming.
   - `succeeded`: analytics snapshot is ready.
   - `failed`: file requires correction or rerun.

## How To Interpret the Result

- `succeeded` means the file produced a usable analytics snapshot.
- `failed` means you should check data quality issues (missing fields, invalid types, malformed rows).

## Action Readiness in `/analytics/sales`

After upload succeeds, use the row action menu on `/analytics/sales` as the guided workflow entry point:

- `Matrix`: opens when COGS is ready for that analytics snapshot.
- `COGS`: always available to complete missing item costs.
- `Heatmap`, `Pairs`, `Finance`: require COGS (`Needs COGS` badge when missing).
- `Scheduler`, `Attribution`: require attribution inputs (`Needs Attribution` badge when mappings/posts are not ready).

Each action shows a readiness badge (`Ready`, `Needs COGS`, `Needs Attribution`, `Degraded`, `Blocked`) and a tooltip explanation. This prevents dead-end clicks and makes next steps explicit for both marketers and menu analysts.

## Example

- You upload `Sales_Recapitulation_Detail_Report_Jan-Mar_2025.xlsx` for Location A.
- Status becomes `succeeded`.
- You open the action menu for that snapshot, complete `COGS` if required, then continue to matrix/heatmap/pairs/scheduler flows based on readiness badges.

## Why It Delivers Real Value

- Marketers: faster path from raw sales data to actionable promotion candidates.
- Analysts: repeatable ingestion with dedup/idempotency safeguards, reducing manual spreadsheet reconciliation.

## Common Mistakes To Avoid

- Uploading the same period repeatedly without checking existing snapshot list.
- Mixing multiple locations into one file.
- Ignoring failed status and proceeding to decision pages.
