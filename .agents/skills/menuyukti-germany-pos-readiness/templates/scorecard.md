# Scorecard

| Field           | Value     |
| --------------- | --------- |
| Audit ID        |           |
| Scoring version | `1.0.0`   |
| Mode            |           |
| Overall score   |           |
| Provisional?    | yes \| no |
| Launch decision |           |

## Category scores

| Category                             |   Weight | Score | Provisional | Historical (DELTA) | Confidence | Notes |
| ------------------------------------ | -------: | ----: | ----------- | ------------------ | ---------- | ----- |
| German fiscal compliance engineering |      20% |       |             |                    |            |       |
| VAT and financial correctness        |      10% |       |             |                    |            |       |
| Payments and transaction integrity   |      15% |       |             |                    |            |       |
| GDPR and security engineering        |      15% |       |             |                    |            |       |
| POS operational reliability          |      15% |       |             |                    |            |       |
| German localization                  |       5% |       |             |                    |            |       |
| Architecture and maintainability     |       5% |       |             |                    |            |       |
| Automated testing and QA             |       5% |       |             |                    |            |       |
| DevOps and production operations     |       5% |       |             |                    |            |       |
| Observability and recovery           |       5% |       |             |                    |            |       |
| **Overall**                          | **100%** |       |             |                    |            |       |

## Check-level detail

Populate per category using stable check IDs from `references/scoring-methodology.md`.

### Example row

| Check ID | Status  | Score | Path               | Symbol            | Lines   | Verification    | Confidence |
| -------- | ------- | ----: | ------------------ | ----------------- | ------- | --------------- | ---------- |
| FIS-01   | PARTIAL |    50 | `apps/graphql/...` | `get_fiscal_port` | `42-60` | code_inspection | medium     |

### Fiscal

| Check ID | Status | Score | Evidence summary |
| -------- | ------ | ----: | ---------------- |
| FIS-01   |        |       |                  |
| FIS-02   |        |       |                  |
| FIS-03   |        |       |                  |
| FIS-04   |        |       |                  |
| FIS-05   |        |       |                  |
| FIS-06   |        |       |                  |
| FIS-07   |        |       |                  |
| FIS-08   |        |       |                  |
| FIS-09   |        |       |                  |
| FIS-10   |        |       |                  |
| FIS-11   |        |       |                  |
| FIS-12   |        |       |                  |
| FIS-13   |        |       |                  |
| FIS-14   |        |       |                  |

### VAT

| Check ID        | Status | Score | Evidence summary |
| --------------- | ------ | ----: | ---------------- |
| VAT-01 … VAT-14 |        |       |                  |

### Payments

| Check ID        | Status | Score | Evidence summary |
| --------------- | ------ | ----: | ---------------- |
| PAY-01 … PAY-12 |        |       |                  |

### Security / GDPR

| Check ID        | Status | Score | Evidence summary |
| --------------- | ------ | ----: | ---------------- |
| SEC-01 … SEC-12 |        |       |                  |
| GDP-01 … GDP-07 |        |       |                  |

### Reliability / Localization / Architecture / Testing / DevOps / Observability

| Check ID                                     | Status | Score | Evidence summary |
| -------------------------------------------- | ------ | ----: | ---------------- |
| REL-… / LOC-… / ARC-… / QA-… / OPS-… / OBS-… |        |       |                  |

## NOT_APPLICABLE register

| Check ID | Reason |
| -------- | ------ |
|          |        |

## Insufficient evidence

| Category / Check | Why score is provisional or UNKNOWN |
| ---------------- | ----------------------------------- |
|                  |                                     |
