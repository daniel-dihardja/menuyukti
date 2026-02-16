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

## Example

- You upload `Sales_Recapitulation_Detail_Report_Jan-Mar_2025.xlsx` for Location A.
- Status becomes `succeeded`.
- You can now open `/analytics/{analyticsId}/matrix` and start decisioning.

## Why It Delivers Real Value

- Marketers: faster path from raw sales data to actionable promotion candidates.
- Analysts: repeatable ingestion with dedup/idempotency safeguards, reducing manual spreadsheet reconciliation.

## Common Mistakes To Avoid

- Uploading the same period repeatedly without checking existing snapshot list.
- Mixing multiple locations into one file.
- Ignoring failed status and proceeding to decision pages.
