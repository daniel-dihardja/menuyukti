# POS operational reliability and offline

**Reference version:** `1.0.0`

## Reliability checks

| Check ID | Capability                      | Evidence cues                                       |
| -------- | ------------------------------- | --------------------------------------------------- |
| REL-01   | Multiple cashiers               | Concurrent session/auth model; conflict handling    |
| REL-02   | Multiple terminals              | Register identity; device binding                   |
| REL-03   | Concurrent orders               | DB isolation; order versioning                      |
| REL-04   | Offline operation               | Local queue/store; clear online/offline mode        |
| REL-05   | Synchronization                 | Ordered sync; conflict policy; duplicate prevention |
| REL-06   | Network outages                 | Timeouts; retries; user-visible state               |
| REL-07   | Printer failures                | Retry; alternate Beleg channel                      |
| REL-08   | Database failures               | Fail closed; no corrupted half-writes               |
| REL-09   | Application crashes             | Durable draft/intent; recovery on restart           |
| REL-10   | Device restarts                 | Resume incomplete checkout safely                   |
| REL-11   | Kitchen display sync            | Eventual consistency; no lost tickets               |
| REL-12   | End-of-day closing              | Z-report / close register workflow                  |
| REL-13   | Cash reconciliation             | Expected vs counted cash                            |
| REL-14   | Multi-location                  | Location scoping; no cross-location bleed           |
| REL-15   | Incomplete transaction recovery | Detect and resolve stuck payments/fiscal            |

## Offline design questions (must answer from code)

1. Is offline mode implemented, stubbed, or absent?
2. What is stored locally (orders, payments, fiscal intents)?
3. Can fiscalization occur offline (local TSE) or must it defer?
4. How are clock skew and Europe/Berlin DST handled for offline timestamps?
5. What happens when offline tickets collide with online edits after reconnect?

## Scoring guidance

- Absent offline with no documented online-only constraint for Germany launch → may be P1/P2 depending on deployment model, but must be explicit in launch decision.
- Claimed offline without sync tests → max `IMPLEMENTED_NOT_TESTED` / score ≤ 50 for related checks.
- Online-only POS can score via REL-04 as `NOT_APPLICABLE` **only** if product docs and ops runbooks state online-only and launch plan accepts that constraint.
