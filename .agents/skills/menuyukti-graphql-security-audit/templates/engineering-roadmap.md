# GraphQL security — engineering roadmap

| Field    | Value |
| -------- | ----- |
| Audit ID |       |
| Mode     |       |

Ordered by severity, then effort. Do not implement here — plan only.

## P0 — clear risk blockers

| Finding ID | Remediation | Owner hint | Effort |
| ---------- | ----------- | ---------- | ------ |
|            |             |            | S/M/L  |

## P1 — high priority

| Finding ID | Remediation | Owner hint | Effort |
| ---------- | ----------- | ---------- | ------ |
|            |             |            | S/M/L  |

## P2 / P3 — hardening backlog

| Finding ID | Remediation | Owner hint | Effort |
| ---------- | ----------- | ---------- | ------ |
|            |             |            | S/M/L  |

## Suggested verification after fixes

- Add or extend negative authz tests (`OTHER_USER` / foreign `location_id`)
- Re-run FOCUSED audit on touched scopes
- Re-run FULL audit before treating risk decision as `ACCEPTABLE`
