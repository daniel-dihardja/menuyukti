# Epic: Menuyukti Package Improvement

## Epic ID
EPIC-MENUYUKTI-PACKAGE-IMPROVEMENT

## Owner
TBD

## Status
Done

## Goal
Improve `packages/menuyukti` so it becomes a reliable, testable, and extensible decision engine for restaurant Instagram marketing workflows.

## Why This Epic
- The package already contains core models and legacy feature modules (`inputs`, `matrix_item`, `matrix_distribution`, and retired audience leftovers), but needs stronger consistency and production-hardening.
- A stronger engine contract reduces downstream breakage in web/agents.
- Better model boundaries and validation will make future agent orchestration easier and safer.

## MVP Outcome
By the end of this epic:
- Inputs are validated and normalized consistently.
- Core decision models are stable and versioned.
- Feature computations are deterministic and well-tested.
- Engine outputs are contract-safe for web + agents integration.

## Scope (In)
- Dead-code removal and module simplification before refactors.
- Input contract normalization and validation hardening.
- Core model cleanup for matrix entities/distributions.
- Feature module consistency, including cleanup of retired audience implementation leftovers.
- Strict typing and type-safe boundaries across core + feature modules.
- Deterministic scoring/ordering behavior for repeatable outcomes.
- Unit-test expansion for all changed logic, plus integration coverage where relevant.
- Targeted code comments for non-obvious logic paths.
- README update for package usage, type expectations, and testing workflow.

## Scope (Out)
- Multi-agent orchestration logic.
- UI redesign work.
- New channel expansion beyond Instagram-focused menuyukti package use cases.

## Delivery Sequence (Hard Order)
1. Remove unused/dead code and simplify module surface.
2. Contract + input normalization foundation.
3. Core model consistency and strict typing cleanup.
4. Feature module cleanup/alignment (retired audience leftovers + matrix distribution behavior).
5. Deterministic scoring/ranking guarantees.
6. Unit tests for all changed logic + integration contract tests for representative scenarios.
7. Performance pass for key computation paths.
8. README/docs update with examples and developer guidance.

## Story List
1. **ME-00: Dead Code Audit and Removal**
- Identify and remove unreachable/unused code paths in `core` and `features` modules.

2. **ME-01: Canonical Input Contract and Validation Layer**
- Define strict input schema, defaults, and error semantics.

3. **ME-02: Core Model Consistency Refactor**
- Align `matrix_item` and `matrix_distribution` model fields, types, and invariants.

4. **ME-03: Audience Implementation Decommission**
- Remove or de-scope leftover audience implementation no longer needed after audience agent retirement.

5. **ME-04: Deterministic Ranking and Tie-Break Rules**
- Make scoring/ranking reproducible with explicit tie-break hierarchy.

6. **ME-05: Contract-Safe Output Envelope**
- Expose stable engine output shape for web/agents consumers with clear versioning.

7. **ME-06: Type-Safety Hardening**
- Ensure all touched modules are type-safe and pass strict type checks without ignores.

8. **ME-07: Unit + Integration Test Pack**
- Add unit tests for changed logic and integration tests with mocked/fixture inputs covering marketer scenarios.

9. **ME-08: Performance and Cost Guardrails**
- Add lightweight performance baselines and identify hotspots in compute-heavy steps.

10. **ME-09: Developer and Consumer Documentation**
- Update package README/docs with usage, extension rules, contract examples, and tuning/testing workflow.

## Acceptance Criteria
- Unused/dead code identified in scope modules is removed (or explicitly justified if retained).
- Engine input validation rejects malformed payloads with clear reason codes.
- Matrix-related models produce stable, schema-valid objects under repeated runs.
- Retired audience leftovers are removed (or explicitly de-scoped) without breaking active package consumers.
- Matrix distribution results are deterministic for identical inputs.
- All touched code paths are type-safe and pass project type checks.
- Output contract is versioned and consumed by integration tests.
- Unit tests cover changed logic branches; integration tests cover success, degraded, and edge-case behavior.
- Non-obvious business logic has concise explanatory comments.
- `packages/menuyukti/README.md` is updated with command examples and expected contracts.
- Performance baseline is recorded for core scenarios and regressions are detectable.

## Test Execution Rule (Per Story)
- Add unit tests for isolated logic changes.
- Add integration tests for cross-module behavior changes.
- If a story is docs-only, explicitly mark test impact as N/A.

## Risks
- Hidden coupling between existing consumers and current model shape.
- Over-normalization may break implicit behavior relied upon in older flows.
- Performance regressions from additional validation layers.

## Mitigations
- Keep changes behind explicit contract version boundaries where needed.
- Add snapshot/contract regression tests before broad refactors.
- Track baseline timings before and after each compute-path change.
