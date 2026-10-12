# Scoring methodology

**Scoring version:** `1.0.0`  
**Skill version compatibility:** `1.0.0`  
**Do not silently change this methodology.** Bump scoring version and explain migration in audit reports if rules change.

## Category weights

| Category key    | Display name                         | Weight % |
| --------------- | ------------------------------------ | -------: |
| `fiscal`        | German fiscal compliance engineering |       20 |
| `vat`           | VAT and financial correctness        |       10 |
| `payments`      | Payments and transaction integrity   |       15 |
| `security_gdpr` | GDPR and security engineering        |       15 |
| `reliability`   | POS operational reliability          |       15 |
| `localization`  | German localization                  |        5 |
| `architecture`  | Architecture and maintainability     |        5 |
| `testing`       | Automated testing and QA             |        5 |
| `devops`        | DevOps and production operations     |        5 |
| `observability` | Observability and recovery           |        5 |
|                 | **TOTAL**                            |  **100** |

`overall = sum(category_score_i * weight_i / 100)`

## Baseline rubric (per check)

| Score | Interpretation                                             |
| ----: | ---------------------------------------------------------- |
|     0 | Missing                                                    |
|    25 | Minimal implementation                                     |
|    50 | Partial implementation                                     |
|    75 | Substantially implemented, insufficient verification       |
|    90 | Implemented with strong verification                       |
|   100 | Implemented, verified, documented, operationally evidenced |

Intermediate scores allowed when justified by the checklist below.

## Status → score ceiling

| Status                   |                                                                 Max check score without extra evidence |
| ------------------------ | -----------------------------------------------------------------------------------------------------: |
| `MISSING`                |                                                                                                      0 |
| `UNKNOWN`                | Do not treat as compliant; exclude from optimistic scoring or use provisional ≤ 25 with low confidence |
| `PARTIAL`                |                                                                50 (up to 60 if strong partial + tests) |
| `IMPLEMENTED_NOT_TESTED` |                                                                                                     75 |
| `VERIFIED`               |                                                                                                 90–100 |
| `NOT_APPLICABLE`         |                                                            Exclude from category average; document why |

**UNKNOWN must never be scored as compliant.**

## Category score aggregation

1. List all applicable checks for the category (see check IDs below).
2. Exclude `NOT_APPLICABLE` from the average; list them separately.
3. Category score = weighted average of applicable checks (default: equal weight per check unless table specifies otherwise).
4. If >30% of applicable checks are `UNKNOWN` or lack path-level evidence → category is **provisional**; overall may be `UNKNOWN` or marked provisional.

### Check weights within categories

Unless overridden, each check in a category has equal weight.

**Fiscal overrides (emphasize launch-critical):**

| Check                                                          | Relative weight |
| -------------------------------------------------------------- | --------------: |
| FIS-01, FIS-02, FIS-03, FIS-04, FIS-06, FIS-07, FIS-12, FIS-14 |             1.5 |
| FIS-05, FIS-08, FIS-09, FIS-10, FIS-11, FIS-13                 |             1.0 |

**Payments overrides:**

| Check                                  | Relative weight |
| -------------------------------------- | --------------: |
| PAY-07, PAY-08, PAY-09, PAY-11, PAY-12 |             1.5 |
| Others                                 |             1.0 |

## Stable check ID catalog

### Fiscal (`fiscal`) — FIS-01 … FIS-14

See [germany-fiscal-requirements.md](germany-fiscal-requirements.md).

### VAT (`vat`) — VAT-01 … VAT-14

See [germany-vat-requirements.md](germany-vat-requirements.md).

### Payments (`payments`) — PAY-01 … PAY-12

See [pos-transaction-integrity.md](pos-transaction-integrity.md).

### Security + GDPR (`security_gdpr`) — SEC-01 … SEC-12, GDP-01 … GDP-07

See [gdpr-security-checklist.md](gdpr-security-checklist.md).  
Category score = 0.6 × mean(SEC applicable) + 0.4 × mean(GDP applicable).

### Reliability (`reliability`) — REL-01 … REL-15

See [pos-offline-reliability.md](pos-offline-reliability.md).

### Localization (`localization`) — LOC-01 … LOC-05

### Architecture (`architecture`) — ARC-01 … ARC-06

### Testing (`testing`) — QA-01 … QA-06

### DevOps (`devops`) — OPS-01 … OPS-07

### Observability (`observability`) — OBS-01 … OBS-06

See [engineering-quality.md](engineering-quality.md).

## Confidence (tracked separately)

| Level    | Meaning                                             |
| -------- | --------------------------------------------------- |
| `high`   | Code + tests (or ops evidence) inspected this audit |
| `medium` | Code inspected; tests thin or not run               |
| `low`    | Incomplete inspection or ambiguous evidence         |
| `none`   | Insufficient evidence                               |

Report overall evidence confidence as the minimum confidence across P0-relevant categories (`fiscal`, `payments`, `security_gdpr`).

## Score change rules

1. Explain every category delta vs prior comparable audit.
2. If scoring version differs from prior audit → **do not** publish unqualified score comparison; note methodology change.
3. DELTA audits must label historical category scores that were not revalidated.
4. Never inflate scores without verification.

## Launch decision vs score

Launch decision is **independent**. Example: score 85 with open FIS-04 P0 → `NO-GO`.
