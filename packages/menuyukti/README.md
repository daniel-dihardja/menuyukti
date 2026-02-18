# Menuyukti Package

## Purpose

`menuyukti` converts restaurant sales data into deterministic, contract-safe outputs for web and agents consumers.

Primary focus:
- canonical analytics transforms
- strict input validation
- versioned output contracts

## Package Structure

- `src/menuyukti/core/inputs.py`: canonical `CoreInputs` contract.
- `src/menuyukti/core/models/`: typed domain models.
- `src/menuyukti/core/analytics/`: deterministic analytics functions.
- `src/menuyukti/core/contracts/`: versioned payload/envelope models and adapters.
- `scripts/perf_guardrails.py`: lightweight benchmark and regression guardrail checks.

## Consumer Flow

1. Build analytics outputs (`calculate_sales_analytics`, `calculate_menu_engineering_matrix`).
2. Convert to envelope (`to_sales_analytics_envelope_v1`, `to_menu_matrix_envelope_v1`).
3. Convert to canonical models (`to_core_*` adapters).
4. Build `CoreInputs` and pass to downstream consumers.

## Canonical Input Rules

`CoreInputs` enforces:
- `matrix_items`: required and non-empty.
- `heatmaps`: required and non-empty.
- `distribution`: required and unique category rows.
- `sales_summary`: optional.
- unknown fields: rejected.

Validation guarantees:
- heatmap menus must exist in matrix items.
- distribution categories cannot duplicate.
- validation failures use stable code-prefixed errors.

Normalization guarantees:
- matrix items, heatmaps, and distribution categories are sorted deterministically.

## Contract Versioning

Output envelope for machine consumers is `ContractEnvelopeV1`:
- `contract_version`: `v1`
- `contract_type`: `sales_analytics` or `menu_matrix`
- `metadata`: source/pipeline metadata
- `payload`: typed domain payload

Example (`menu_matrix`):

```json
{
  "contract_version": "v1",
  "contract_type": "menu_matrix",
  "metadata": {
    "schema_version": "v1",
    "source_system": "api",
    "pipeline_run_id": "run-123",
    "ingested_at_utc": "2026-02-19T01:00:00Z",
    "quality_status": "passed"
  },
  "payload": {
    "thresholds": {
      "avg_popularity": 10.5,
      "avg_contribution_margin": 22.4,
      "total_cogs": 1000.0,
      "total_profit": 2500.0,
      "total_margin": 0.7143
    },
    "distribution": [],
    "items": []
  }
}
```

## Commands

Type checks:
- `uv run --project packages/menuyukti --group dev mypy src/menuyukti`

Tests:
- `uv run --project packages/menuyukti --group dev pytest tests`
- `uv run --project packages/menuyukti --group dev pytest tests/unit tests/analytics/integration tests/analytics/contract`

Performance guardrails:
- `uv run --project packages/menuyukti --group dev python scripts/perf_guardrails.py --mode report`
- `uv run --project packages/menuyukti --group dev python scripts/perf_guardrails.py --mode check`

Artifacts:
- baseline: `packages/menuyukti/perf/baseline_v1.json`
- guardrail runner: `packages/menuyukti/scripts/perf_guardrails.py`

## Extension Points

Safe extension points for new features:
- add new analytics function in `core/analytics/` with deterministic sorting and explicit tie-breaks.
- add/extend contracts under `core/contracts/v1.py` and keep adapters backward-compatible.
- extend `CoreInputs` only when consumer-facing semantics are clear and validated.

When changing contracts:
- keep old aliases in adapters where needed.
- add unit tests + integration tests for compatibility.
- update this README and story/spec references.

## Code Comment Convention

Comments are required only for non-obvious logic:
- explain business rule rationale (not line-by-line mechanics).
- explain deterministic ordering/tie-break decisions.
- explain compatibility shims and deprecation behavior.

Avoid noise comments that restate code.

## References

- Planning spec: `packages/docs/planning/SPECS.md`
- Epic: `packages/docs/planning/archive/EPIC-MENUYUKTI-PACKAGE-IMPROVEMENT/epic-menuyukti-package-improvement.md`
- Core contract references:
  - `packages/docs/contracts/DECISION_CONTRACT_V1.md`
  - `packages/docs/contracts/ANALYST_MATRIX_EXPORT_CONTRACT.md`
  - `packages/docs/contracts/HEATMAP_EXPORT_CONTRACT.md`
