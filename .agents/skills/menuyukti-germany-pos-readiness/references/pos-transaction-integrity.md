# Payments and transaction integrity

**Scoring / reference version:** `1.0.0`

## Engineering checks

| Check ID | Capability                       | Failure modes if missing                               |
| -------- | -------------------------------- | ------------------------------------------------------ |
| PAY-01   | Cash payments                    | Incomplete cash drawer / Z-report integrity            |
| PAY-02   | Card payment integrations        | Lost authorizations; unreconciled captures             |
| PAY-03   | Payment lifecycle                | Ambiguous states (authorized/captured/failed/refunded) |
| PAY-04   | Split payments                   | Partial capture without order consistency              |
| PAY-05   | Partial payments                 | Ticket closed while balance remains                    |
| PAY-06   | Refunds                          | Refund without fiscal reverse; over-refund             |
| PAY-07   | Idempotency                      | Double charge on retry                                 |
| PAY-08   | Duplicate webhooks               | Duplicate payment or fiscal records                    |
| PAY-09   | Transaction boundaries           | Partial DB commits across order/payment/fiscal         |
| PAY-10   | Reconciliation                   | Unmatched payment provider vs POS ledger               |
| PAY-11   | Partial failure recovery         | Payment OK / order fail (or reverse)                   |
| PAY-12   | Order/payment/fiscal consistency | Divergent truths across three stores                   |

## Consistency invariants (assert in audit)

1. Every **paid** ticket has matching payment evidence summing to total (within rounding rules).
2. Every **fiscally finished** sale has a fiscal process in a terminal success state (or documented deferred policy — rare and must be explicit).
3. Refunds create compensating financial and fiscal records linked to originals.
4. Idempotency keys / request IDs prevent duplicate side effects.
5. Webhooks are deduplicated by provider event ID.

## Critical failure scenarios (detail matrix)

For each scenario in SKILL.md § critical list, fill:

| Field                           | Content                          |
| ------------------------------- | -------------------------------- |
| Expected behavior               | Spec / desired POS behavior      |
| Current implementation evidence | Paths, functions, lines          |
| Existing safeguards             | Locks, retries, idempotency, txs |
| Missing safeguards              | Gaps                             |
| Business impact                 | Money / ops                      |
| Compliance implications         | Fiscal / GDPR if any             |
| Severity                        | P0–P3                            |
| Recommended tests               | Automated + manual               |
| Required remediation            | Concrete engineering task        |

### Scenario focus notes

| #   | Scenario                         | Primary checks                                                 |
| --- | -------------------------------- | -------------------------------------------------------------- |
| 1   | Internet disconnect mid-checkout | Offline queue, timeout, client retry                           |
| 2   | Payment OK / order update fail   | Compensating transaction, reconcile job                        |
| 3   | Duplicated payment request       | Idempotency keys                                               |
| 4   | TSE unavailable                  | Fail closed vs queue; no fake success                          |
| 5   | Fiscal transaction fails         | Order state machine; retry                                     |
| 6   | Two cashiers one order           | Optimistic locking / version / row lock                        |
| 7   | Restart during payment           | Durable intent log; resume                                     |
| 8   | DB unavailable                   | Fail closed; no silent local-only paid state without sync plan |
| 9   | Refund after fiscalization       | Refund fiscal process                                          |
| 10  | Printer disconnect               | Beleg retry; digital fallback                                  |
| 11  | Duplicate webhook                | Event ID uniqueness                                            |
| 12  | Offline sync                     | Conflict resolution; ordering                                  |
| 13  | Tax config change                | Snapshot immutability                                          |
| 14  | Tenant isolation                 | AuthZ tests                                                    |
| 15  | Backup restore                   | Sequence / fiscal continuity                                   |

## Typical MenuYukti touchpoints

- `apps/graphql/services/pos_orders.py`
- Payment-related mutations/services (search `payment`, `refund`, `webhook`)
- `pos_fiscalization.py` finish/cancel/refund
- Audit events in `pos_audit.py`
