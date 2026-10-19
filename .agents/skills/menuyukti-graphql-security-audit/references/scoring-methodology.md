# Scoring methodology

**Scoring version:** `1.0.0`

## Category keys

| Key              | Weight | Checklist prefix |
| ---------------- | -----: | ---------------- |
| `identity`       |    20% | AUTH-\*          |
| `authorization`  |    30% | AZ-\*            |
| `abuse`          |    10% | ABU-\*           |
| `disclosure`     |    10% | DIS-\*           |
| `injection`      |    10% | INJ-\*           |
| `secrets`        |     5% | SEC-\*           |
| `trust_boundary` |    10% | TB-\*            |
| `testing`        |     5% | TST-\*           |

## Per-check score (0–100)

| Status                   | Score guidance                                  |
| ------------------------ | ----------------------------------------------- |
| `VERIFIED`               | 90–100 (100 only with automated negative test)  |
| `IMPLEMENTED_NOT_TESTED` | 60–80                                           |
| `PARTIAL`                | 30–55                                           |
| `MISSING`                | 0–15                                            |
| `UNKNOWN`                | exclude from category average; mark provisional |
| `NOT_APPLICABLE`         | exclude from category average                   |

Category score = mean of in-scope applicable check scores for that category.

Overall = Σ(category_score × weight). If any category is provisional/UNKNOWN with weight ≥ 10%, mark overall provisional.

## Severity rubric

| Severity | Meaning                                                                                      |
| -------- | -------------------------------------------------------------------------------------------- |
| P0       | Auth bypass, cross-tenant read/write of PII/money, or trivial prod IDOR                      |
| P1       | Significant authz gap, missing guards on sensitive mutations, key optional in prod-like path |
| P2       | Defense-in-depth gap (limits incomplete, weak tests, disclosure)                             |
| P3       | Hardening / hygiene                                                                          |

Open P0 ⇒ risk decision cannot be `ACCEPTABLE`.

## Sampling vs completeness

If authorization sampling coverage of root fields is &lt; 70%, cap `authorization` category at **75** unless remaining fields are low-risk and explicitly reviewed as N/A, and state coverage % in the scorecard.
