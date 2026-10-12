# Audit report schema

**Schema version:** `1.0.0`

## Finding record (required fields)

| Field                 | Type   | Notes                                                                                 |
| --------------------- | ------ | ------------------------------------------------------------------------------------- |
| `finding_id`          | string | Stable across audits, e.g. `FIND-FIS-004`                                             |
| `requirement`         | string | Human requirement statement                                                           |
| `check_id`            | string | e.g. `FIS-04`                                                                         |
| `category`            | string | Category key from scoring methodology                                                 |
| `status`              | enum   | VERIFIED \| IMPLEMENTED_NOT_TESTED \| PARTIAL \| MISSING \| UNKNOWN \| NOT_APPLICABLE |
| `repository_path`     | string | File path                                                                             |
| `symbol`              | string | Function / class / mutation name                                                      |
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
  "audit_id": "AUD-YYYYMMDD-HHMM-<shortsha>",
  "timestamp_iso": "2026-10-12T12:00:00+01:00",
  "git": {
    "branch": "main",
    "commit_sha": "fullsha",
    "working_tree_clean": true
  },
  "mode": "FULL",
  "scope": ["all"],
  "skill_version": "1.0.0",
  "scoring_version": "1.0.0",
  "regulatory_reference_version": "1.0.0",
  "overall_score": null,
  "overall_score_provisional": true,
  "evidence_confidence": "low",
  "launch_decision": "INSUFFICIENT EVIDENCE",
  "launch_blockers": [],
  "category_scores": {
    "fiscal": { "score": null, "provisional": true, "historical": false },
    "vat": { "score": null, "provisional": true, "historical": false },
    "payments": { "score": null, "provisional": true, "historical": false },
    "security_gdpr": { "score": null, "provisional": true, "historical": false },
    "reliability": { "score": null, "provisional": true, "historical": false },
    "localization": { "score": null, "provisional": true, "historical": false },
    "architecture": { "score": null, "provisional": true, "historical": false },
    "testing": { "score": null, "provisional": true, "historical": false },
    "devops": { "score": null, "provisional": true, "historical": false },
    "observability": { "score": null, "provisional": true, "historical": false }
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

### `docs/audits/germany-readiness/latest/` (FULL / comparable DELTA baseline)

| File                     | Source template                      |
| ------------------------ | ------------------------------------ |
| `executive-summary.md`   | templates/executive-summary.md       |
| `scorecard.md`           | templates/scorecard.md               |
| `findings.md`            | templates/findings-register.md       |
| `compliance-gaps.md`     | templates/compliance-gap-analysis.md |
| `failure-scenarios.md`   | templates/failure-scenario-matrix.md |
| `engineering-roadmap.md` | templates/engineering-roadmap.md     |
| `evidence-register.md`   | condensed finding evidence table     |

### `docs/audits/germany-readiness/history/YYYY-MM-DD_HH-mm_<commit>/`

Immutable copy including `audit.json`, key markdown reports, and `comparison.md` (from audit-comparison template).

### `progress.md`

Rolling human-readable progress after each comparable FULL/DELTA.

## Focused audit rule

FOCUSED audits write under `history/` with `mode: FOCUSED` and **must not** overwrite `latest/` full baseline unless the user explicitly requests a baseline refresh.
