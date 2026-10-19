# Audit report schema

**Schema version:** `1.0.0`

## Finding record (required fields)

| Field                 | Type   | Notes                                                                                 |
| --------------------- | ------ | ------------------------------------------------------------------------------------- |
| `finding_id`          | string | Stable across audits, e.g. `FIND-GQL-AZ-004`                                          |
| `requirement`         | string | Human requirement statement                                                           |
| `check_id`            | string | e.g. `AZ-05`                                                                          |
| `category`            | string | Category key from scoring methodology                                                 |
| `status`              | enum   | VERIFIED \| IMPLEMENTED_NOT_TESTED \| PARTIAL \| MISSING \| UNKNOWN \| NOT_APPLICABLE |
| `repository_path`     | string | File path                                                                             |
| `symbol`              | string | Function / class / field / mutation name                                              |
| `line_numbers`        | string | e.g. `42-88`                                                                          |
| `evidence`            | string | What was observed (no invention)                                                      |
| `test_coverage`       | string | Tests found or “none found”                                                           |
| `verification_method` | string | code_inspection \| automated_test \| manual \| ops_evidence                           |
| `severity`            | enum   | P0 \| P1 \| P2 \| P3                                                                  |
| `confidence`          | enum   | high \| medium \| low \| none                                                         |
| `remediation`         | string | Recommended engineering fix                                                           |

## `audit.json` (history snapshot)

```json
{
  "schema_version": "1.0.0",
  "audit_id": "AUD-GQL-YYYYMMDD-HHMM-<shortsha>",
  "timestamp_iso": "2026-10-19T12:00:00+02:00",
  "git": {
    "branch": "main",
    "commit_sha": "fullsha",
    "working_tree_clean": true
  },
  "mode": "FULL",
  "scope": ["all"],
  "skill_version": "1.0.0",
  "scoring_version": "1.0.0",
  "overall_score": null,
  "overall_score_provisional": true,
  "evidence_confidence": "low",
  "risk_decision": "INSUFFICIENT EVIDENCE",
  "risk_blockers": [],
  "authorization_sample_coverage_pct": null,
  "category_scores": {
    "identity": { "score": null, "provisional": true, "historical": false },
    "authorization": { "score": null, "provisional": true, "historical": false },
    "abuse": { "score": null, "provisional": true, "historical": false },
    "disclosure": { "score": null, "provisional": true, "historical": false },
    "injection": { "score": null, "provisional": true, "historical": false },
    "secrets": { "score": null, "provisional": true, "historical": false },
    "trust_boundary": { "score": null, "provisional": true, "historical": false },
    "testing": { "score": null, "provisional": true, "historical": false }
  },
  "findings": [],
  "resolved_finding_ids": [],
  "new_finding_ids": [],
  "regression_finding_ids": [],
  "prior_audit_id": null,
  "notes": []
}
```

## Output files

### `docs/audits/graphql-security/latest/` (FULL / comparable DELTA baseline)

| File                     | Source template                  |
| ------------------------ | -------------------------------- |
| `executive-summary.md`   | templates/executive-summary.md   |
| `scorecard.md`           | templates/scorecard.md           |
| `findings.md`            | templates/findings-register.md   |
| `engineering-roadmap.md` | templates/engineering-roadmap.md |
| `evidence-register.md`   | condensed finding evidence table |

### `docs/audits/graphql-security/history/YYYY-MM-DD_HH-mm_<commit>/`

Immutable copy including `audit.json`, key markdown reports, and `comparison.md` (from audit-comparison template).

### `progress.md`

Rolling human-readable progress after each comparable FULL/DELTA.

## Focused audit rule

FOCUSED audits write under `history/` with `mode: FOCUSED` and **must not** overwrite `latest/` full baseline unless the user explicitly requests a baseline refresh.
