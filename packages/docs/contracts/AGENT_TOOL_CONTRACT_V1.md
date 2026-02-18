# Agent Tool Contract V1

## Purpose
Define a versioned contract and runtime policy gate for agent tool invocations.

## Endpoint
- Agents app route: `POST /tools/invoke`

## Request Contract (`v1`)

```json
{
  "contract_version": "v1",
  "tool_id": "decision_context.read",
  "persona": "marketer",
  "workflow_stage": "planning",
  "scope": {
    "location_id": 1,
    "analytics_id": 1
  },
  "payload": {}
}
```

Fields:
- `contract_version`: `"v1"` (required)
- `tool_id`:
  - `decision_context.read`
  - `scheduler.handoff`
  - `analyst.export`
  - `learning.feedback.write`
- `persona`: `marketer | analyst`
- `workflow_stage`: `planning | execution | analysis | learning`
- `scope`: `location_id`, `analytics_id`
- `payload`: tool-specific input payload

## Runtime Policy Matrix

| Persona | Stage | Allowed Tools |
|---|---|---|
| marketer | planning | `decision_context.read`, `scheduler.handoff` |
| marketer | execution | `scheduler.handoff` |
| analyst | analysis | `decision_context.read`, `analyst.export` |
| analyst | learning | `learning.feedback.write` |

If tool is not allowed by persona/stage, response is blocked with reason code:
- `TOOL_NOT_ALLOWED_FOR_PERSONA_STAGE`

## Tool Payload Validation Rules

- `decision_context.read`
  - requires `scope.analytics_id`
- `scheduler.handoff`
  - requires `payload.recommendations` as non-empty array
- `analyst.export`
  - requires `payload.dataset` in `{matrix,pairs,combos,attribution}`
- `learning.feedback.write`
  - requires non-empty `payload.recommendation_id`
  - requires non-empty `payload.outcome_label`

On payload contract failure, response includes:
- `status = invalid`
- `reason_code = TOOL_CONTRACT_VALIDATION_FAILED_*`

## Response Shapes

Allowed (`200`):

```json
{
  "contract_version": "v1",
  "status": "accepted",
  "reason_code": "ALLOWED",
  "tool_id": "decision_context.read",
  "persona": "marketer",
  "workflow_stage": "planning"
}
```

Policy blocked (`403`):

```json
{
  "contract_version": "v1",
  "status": "blocked",
  "reason_code": "TOOL_NOT_ALLOWED_FOR_PERSONA_STAGE",
  "tool_id": "scheduler.handoff"
}
```

Contract invalid (`400`):

```json
{
  "contract_version": "v1",
  "status": "invalid",
  "reason_code": "TOOL_CONTRACT_VALIDATION_FAILED_RECOMMENDATIONS_REQUIRED",
  "tool_id": "scheduler.handoff"
}
```
