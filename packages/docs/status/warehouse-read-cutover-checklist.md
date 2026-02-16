# Warehouse Read Cutover Checklist

## Purpose

Define a controlled, reversible migration path from legacy snapshot reads to warehouse-backed reads.

## Flag

- `WAREHOUSE_READS_ENABLED=1` enables warehouse-preferred read path.
- Default (`0` or unset) keeps legacy behavior.

## Endpoint Migration Order

1. Agent input endpoints
- `apps/web/app/api/agents/audience/route.ts`
- `apps/web/app/api/agents/tone/route.ts`

2. Analytics read APIs/pages
- Matrix and heatmap pages/routes.

3. Downstream BI/reporting consumers.

## Rollout Steps

1. Enable flag in non-production environment.
2. Compare outputs against legacy for target endpoints.
3. Review reconciliation metrics and failure logs.
4. Enable in production for limited traffic.
5. Monitor for one release cycle.
6. Promote to default path after parity confidence.

## Rollback

1. Set `WAREHOUSE_READS_ENABLED=0`.
2. Revert to legacy snapshot read path immediately.
3. Keep reconciliation logging active to diagnose divergence.
