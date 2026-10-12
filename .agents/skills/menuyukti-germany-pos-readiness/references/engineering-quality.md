# Architecture, localization, testing, DevOps, observability

**Reference version:** `1.0.0`

## German localization (weight 5%)

| Check ID | Capability                                         |
| -------- | -------------------------------------------------- |
| LOC-01   | German UI strings / i18n (`de`) for POS surfaces   |
| LOC-02   | EUR formatting (`de-DE` / Intl)                    |
| LOC-03   | Europe/Berlin timezone for business day boundaries |
| LOC-04   | DST transition handling for reports and closes     |
| LOC-05   | German date/number formats on receipts and exports |

## Architecture and maintainability (weight 5%)

| Check ID | Capability                                                          |
| -------- | ------------------------------------------------------------------- |
| ARC-01   | Clear layering (GraphQL schema → services → models)                 |
| ARC-02   | Fiscal port abstraction (provider swappable)                        |
| ARC-03   | Migration safety (Alembic; expandable; no destructive fiscal drops) |
| ARC-04   | Multi-tenant boundaries in data model                               |
| ARC-05   | Avoidance of god-services without tests                             |
| ARC-06   | Documented POS state machine (order/payment/fiscal)                 |

## Automated testing and QA (weight 5%)

| Check ID | Capability                                       |
| -------- | ------------------------------------------------ |
| QA-01    | Unit tests for tax/money                         |
| QA-02    | Fiscal lifecycle tests (incl. failure injection) |
| QA-03    | Payment idempotency / webhook tests              |
| QA-04    | Concurrency / optimistic lock tests              |
| QA-05    | Tenant isolation tests                           |
| QA-06    | CI runs POS-related suites                       |

## DevOps and production operations (weight 5%)

| Check ID | Capability                                       |
| -------- | ------------------------------------------------ |
| OPS-01   | Deploy pipeline for GraphQL/web POS              |
| OPS-02   | Environment separation (mock TSE barred in prod) |
| OPS-03   | Config management for fiscal/payment providers   |
| OPS-04   | Backup jobs                                      |
| OPS-05   | Disaster recovery runbook (even draft)           |
| OPS-06   | Rollback strategy without fiscal corruption      |
| OPS-07   | Incident response ownership for POS outages      |

## Observability and recovery (weight 5%)

| Check ID | Capability                                      |
| -------- | ----------------------------------------------- |
| OBS-01   | Structured logs for checkout / fiscal / payment |
| OBS-02   | Metrics / alerts on fiscal failure rate         |
| OBS-03   | Tracing across order → payment → fiscal         |
| OBS-04   | Dead-letter / reconcile queues visibility       |
| OBS-05   | Runbooks for the 15 critical scenarios          |
| OBS-06   | Backup restore drill evidence (if any)          |

## MenuYukti conventions

- Persistence and migrations only in `apps/graphql`.
- Clients call GraphQL only.
- Prefer `uv` for Python tests; `pnpm` for web.
- Safe local tests only during audit unless user approves broader setup.
