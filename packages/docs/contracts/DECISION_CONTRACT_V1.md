# Decision Contract (v1)

## Purpose

Define one canonical decision contract used by:
- analytics decision pages (`matrix`, `heatmap`, `pairs`, `scheduler`, `attribution`, `finance`)
- agent routes for marketer and analyst workflows

This contract ensures recommendations are deterministic, traceable, and readiness-governed.

## Scope

- In scope: decision payload, evidence payload, readiness/confidence semantics, lineage/freshness context, agent I/O envelope.
- Out of scope: UI presentation details, prompt design internals, RBAC policy.

## Versioning

- Contract version: `v1`
- Backward-compatible field additions: `v1.x`
- Breaking changes require new major version (`v2`) and migration adapter.

---

## Canonical Entities

### 1) `DecisionContext`

Describes the exact analytical scope where decisions are produced.

Required fields:
- `contractVersion`: `"v1"`
- `persona`: `"marketer" | "analyst"`
- `locationId`: `number`
- `analyticsId`: `number`
- `timeWindow`: `{ from: ISO8601 | null, to: ISO8601 | null }`
- `filterState`: `object` (route-specific normalized filters)
- `lineage`: `LineageMeta`
- `trust`: `TrustMeta`

### 2) `DecisionInsight`

A single recommendation or insight item presented in UI or agent output.

Required fields:
- `id`: `string` (stable deterministic key per context)
- `category`: `"menu_action" | "timing" | "pair_combo" | "attribution" | "finance" | "cogs"`
- `title`: `string`
- `recommendation`: `string`
- `rationale`: `string`
- `confidence`: `"high" | "medium" | "low" | "blocked"`
- `readiness`: `"ready" | "degraded" | "blocked"`
- `evidenceRefs`: `EvidenceRef[]`

Optional fields:
- `impact`: `{ metric: string, value: number | null, unit: string | null }`
- `actions`: `string[]`
- `tags`: `string[]`

### 3) `EvidenceRef`

Traceability record linking insight claims to deterministic data.

Required fields:
- `source`: `"warehouse" | "marts" | "public_snapshot" | "derived_runtime"`
- `entity`: `string` (table/view/model identifier)
- `metric`: `string`
- `value`: `number | string | boolean | null`
- `key`: `object` (identifying dimensions, e.g. location/menu/date)

Optional fields:
- `pipelineRunId`: `string | null`
- `note`: `string | null`

### 4) `AgentRun`

Operational metadata for a single agent invocation.

Required fields:
- `agentId`: `string`
- `runId`: `string`
- `model`: `string`
- `startedAt`: `ISO8601`
- `finishedAt`: `ISO8601 | null`
- `status`: `"succeeded" | "failed" | "blocked"`
- `inputHash`: `string`
- `outputHash`: `string | null`
- `tokenUsage`: `{ input: number, output: number, total: number } | null`

### 5) `AgentOutput`

Agent response envelope aligned with deterministic decision contract.

Required fields:
- `context`: `DecisionContext`
- `run`: `AgentRun`
- `insights`: `DecisionInsight[]`
- `summary`: `string`

Optional fields:
- `warnings`: `string[]`
- `nextBestActions`: `string[]`

---

## Trust and Readiness Semantics

### Readiness

- `ready`: data quality/freshness policy passed.
- `degraded`: usable with caution; confidence may be downgraded.
- `blocked`: recommendation output must be blocked or explicitly marked blocked.

### Confidence

- `high`: strong deterministic support and no trust downgrade.
- `medium`: valid signal but moderate support or downgraded.
- `low`: weak support or degraded trust context.
- `blocked`: output not decision-safe under current trust policy.

### Policy Rule

Agent and UI must use the same trust status for the same `DecisionContext`.
Agent must not emit `high` confidence when context readiness is `degraded` or `blocked`.

---

## Lineage and Freshness Metadata

### `LineageMeta`

Required fields:
- `pipelineRunId`: `string | null`
- `schemaVersion`: `string | null`
- `sourceSystem`: `string | null`
- `ingestedAtUtc`: `ISO8601 | null`

### `TrustMeta`

Required fields:
- `qualityStatus`: `"passed" | "warn" | "failed" | "unknown"`
- `freshnessMinutes`: `number | null`
- `isStale`: `boolean`
- `reasons`: `string[]`

---

## Page-to-Contract Mapping (MVP)

- `matrix`: emits `DecisionInsight(category="menu_action")` with action rationale and margin evidence.
- `heatmap`: emits `DecisionInsight(category="timing")` with daypart/hour demand evidence.
- `pairs`: emits `DecisionInsight(category="pair_combo")` with support/confidence/lift evidence.
- `scheduler`: consumes matrix/heatmap insights; writes schedule decisions with readiness/confidence inheritance.
- `attribution`: emits `DecisionInsight(category="attribution")` with pre/post delta and confidence reasons.
- `finance`: emits `DecisionInsight(category="finance")` with revenue/cogs/fixed-cost evidence.
- `cogs`: emits `DecisionInsight(category="cogs")` with completeness/readiness evidence.

---

## Minimal JSON Examples

### `DecisionContext` (example)

```json
{
  "contractVersion": "v1",
  "persona": "marketer",
  "locationId": 7,
  "analyticsId": 112,
  "timeWindow": {
    "from": "2026-02-10T00:00:00.000Z",
    "to": "2026-02-16T23:59:59.999Z"
  },
  "filterState": {
    "minLift": 1.1,
    "segment": "weekday"
  },
  "lineage": {
    "pipelineRunId": "2e37946c-505f-4fd9-97a7-534052516725",
    "schemaVersion": "v1",
    "sourceSystem": "esb",
    "ingestedAtUtc": "2026-02-17T23:02:10.309Z"
  },
  "trust": {
    "qualityStatus": "passed",
    "freshnessMinutes": 120,
    "isStale": false,
    "reasons": []
  }
}
```

### `DecisionInsight` (example)

```json
{
  "id": "matrix:menu=iced_latte:action=promote",
  "category": "menu_action",
  "title": "Promote Iced Latte",
  "recommendation": "Promote during afternoon daypart",
  "rationale": "High margin with strong units sold and stable demand",
  "confidence": "high",
  "readiness": "ready",
  "impact": {
    "metric": "estimated_revenue_uplift",
    "value": 12.3,
    "unit": "percent"
  },
  "evidenceRefs": [
    {
      "source": "marts",
      "entity": "vw_menu_engineering_matrix",
      "metric": "margin_pct",
      "value": 0.47,
      "key": {
        "locationId": 7,
        "menuNameNorm": "iced latte"
      },
      "pipelineRunId": "2e37946c-505f-4fd9-97a7-534052516725"
    }
  ]
}
```

### `AgentOutput` (example)

```json
{
  "context": { "contractVersion": "v1", "persona": "analyst", "locationId": 7, "analyticsId": 112, "timeWindow": { "from": null, "to": null }, "filterState": {}, "lineage": { "pipelineRunId": "2e37946c-505f-4fd9-97a7-534052516725", "schemaVersion": "v1", "sourceSystem": "esb", "ingestedAtUtc": "2026-02-17T23:02:10.309Z" }, "trust": { "qualityStatus": "passed", "freshnessMinutes": 120, "isStale": false, "reasons": [] } },
  "run": {
    "agentId": "menu-analyst",
    "runId": "run_01HXYZ",
    "model": "gpt-5",
    "startedAt": "2026-02-18T02:12:00.000Z",
    "finishedAt": "2026-02-18T02:12:03.000Z",
    "status": "succeeded",
    "inputHash": "sha256:...",
    "outputHash": "sha256:...",
    "tokenUsage": { "input": 1800, "output": 420, "total": 2220 }
  },
  "summary": "Prioritize 3 promote actions and 2 combo opportunities this week.",
  "insights": []
}
```

---

## Compatibility Rules

- New optional fields may be added in `v1.x`.
- Existing required fields must not be removed or renamed in `v1.x`.
- If a source page lacks a field, adapter must provide explicit `null` (not omit required keys).
- Breaking field semantic changes require `v2`.

## Acceptance for Story-DC-01

- Canonical entities and field dictionary are finalized.
- Retained pages are mapped to contract categories.
- Trust/readiness semantics are uniform for UI and agent flows.
- JSON examples are sufficient for schema and API implementation kickoff.

## Review Checklist and Sign-off (Story-DC-01)

Use this section to explicitly close Story-DC-01.

- [ ] Product review completed for decision semantics and persona fit.
- [ ] Engineering review completed for schema/API feasibility.
- [x] Retained pages mapping validated:
  - [x] `matrix`
  - [x] `heatmap`
  - [x] `pairs`
  - [x] `scheduler`
  - [x] `attribution`
  - [x] `finance`
  - [x] `cogs`
- [ ] Agent output envelope validated against `DecisionInsight` + `EvidenceRef`.
- [ ] Versioning and compatibility policy confirmed for `v1` rollout.

Sign-off:
- Product owner: `TBD` (date: `YYYY-MM-DD`)
- Engineering owner: `TBD` (date: `YYYY-MM-DD`)
