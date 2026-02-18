# Story ME-05: Contract-Safe Output Envelope

## Story Metadata
- Created Date: 2026-02-18
- Status: `done`
- Parent: EPIC-MENUYUKTI-PACKAGE-IMPROVEMENT

## Goal
Expose a stable, versioned output envelope for package consumers (analytics/agents).

## Why This Matters
- Consumers need reliable machine-parseable output contracts.
- Versioned envelopes reduce integration break risk.

## Scope
- Standardize output envelope fields and version tag.
- Ensure typed domain payload fields are preserved.
- Align contract adapters and metadata helpers with envelope versioning.

## Acceptance Criteria
- Output envelope version is explicit and stable.
- Domain payloads remain typed and parseable.
- Integration tests validate envelope schema and compatibility.

## Deliverables
- Output envelope and adapter updates.
- Contract-focused integration tests.
- Documentation snippet with envelope example.

## Implementation Notes
- Added stable typed envelope and payload models:
  - `packages/menuyukti/src/menuyukti/core/contracts/v1.py`
  - `ContractEnvelopeV1`
  - `SalesAnalyticsPayloadV1`
  - `MenuMatrixPayloadV1`
  - `MatrixThresholdsV1`
- Added envelope adapter helpers:
  - `packages/menuyukti/src/menuyukti/core/contracts/adapters.py`
  - `to_sales_analytics_envelope_v1(...)`
  - `to_menu_matrix_envelope_v1(...)`
- Exported new envelope APIs from contract package:
  - `packages/menuyukti/src/menuyukti/core/contracts/__init__.py`
- Added contract-focused tests:
  - `packages/menuyukti/tests/unit/test_contract_v1_models.py`
  - `packages/menuyukti/tests/unit/test_contract_adapters.py`
  - `packages/menuyukti/tests/analytics/contract/test_output_contracts_v1.py`
- Updated documentation with envelope usage examples:
  - `packages/menuyukti/README.md`
  - `packages/menuyukti/src/menuyukti/README.md`

## Test Evidence
- Contract-specific test run:
  - `uv run --project packages/menuyukti pytest packages/menuyukti/tests/unit/test_contract_v1_models.py packages/menuyukti/tests/unit/test_contract_adapters.py packages/menuyukti/tests/analytics/contract/test_output_contracts_v1.py`
- Full package regression:
  - `uv run --project packages/menuyukti pytest packages/menuyukti/tests`
  - Result: `49 passed`
