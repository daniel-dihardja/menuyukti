# German VAT and financial correctness — engineering checklist

**Regulatory reference version:** `1.0.0`  
**Last skill verification of sources:** `2026-10-12`

Do **not** hardcode legal tax rates or classifications into audit conclusions. Rates and restaurant treatments change; verify against current law / BMF guidance during each audit when network is available.

## Authoritative sources (confirm each audit)

| ID          | Requirement area                | Source                    | URL / locator                                                   | Last verified  | Confidence | Open questions                     |
| ----------- | ------------------------------- | ------------------------- | --------------------------------------------------------------- | -------------- | ---------- | ---------------------------------- |
| REG-VAT-001 | UStG — VAT framework            | Gesetze im Internet / BMF | https://www.gesetze-im-internet.de/ustg_1980/ (confirm current) | needs re-check | medium     | Applicable rates for audit period  |
| REG-VAT-002 | Reduced vs standard rates       | BMF / UStG                | Confirm current paragraphs each audit                           | needs re-check | medium     | Foodservice vs takeaway edge cases |
| REG-VAT-003 | Restaurant / catering treatment | BMF guidance              | Confirm current BMF Schreiben                                   | needs re-check | low–medium | Dine-in vs takeaway vs delivery    |
| REG-VAT-004 | Invoice / receipt tax display   | UStG / GoBD intersection  | Confirm                                                         | needs re-check | medium     | What must appear on POS Beleg      |

Flag any rate or classification used in code as **configuration**, not as proof of legal correctness.

## Engineering checks

| Check ID | Capability                    | What “good” looks like                                                         |
| -------- | ----------------------------- | ------------------------------------------------------------------------------ |
| VAT-01   | German VAT configuration      | Location/tenant-scoped tax config; not single global hardcode without override |
| VAT-02   | Standard & reduced rates      | Configurable rate tables with effective dating                                 |
| VAT-03   | Restaurant-specific treatment | Explicit dine-in / takeaway / delivery tax paths                               |
| VAT-04   | Mixed VAT rates on one ticket | Line-level tax codes; totals reconcile by rate                                 |
| VAT-05   | Product tax classification    | Products map to tax categories; change history retained                        |
| VAT-06   | Tax-inclusive pricing         | Correct extraction of net/tax from brutto; documented rounding                 |
| VAT-07   | Discounts                     | Tax recalculation rules documented and tested                                  |
| VAT-08   | Tips                          | Tip vs taxable consideration separation                                        |
| VAT-09   | Refunds                       | Reverse tax correctly; link to original lines                                  |
| VAT-10   | Split bills                   | Per-party tax integrity; no orphan tax                                         |
| VAT-11   | Rounding                      | Deterministic, tested rounding (cents)                                         |
| VAT-12   | Historical tax config         | Orders retain tax snapshot at sale time                                        |
| VAT-13   | Tax reports & receipts        | Aggregations match line math; receipt shows required tax breakdown             |
| VAT-14   | EUR / money model             | Integer cents or equivalent; no float drift                                    |

## Typical MenuYukti touchpoints

- `apps/graphql/services/pos_tax.py`
- `apps/graphql/services/pos_money.py`
- `apps/graphql/services/pos_orders.py`
- POS order / line models and migrations mentioning tax
- Any web POS cart tax display

## Audit guidance

1. Walk dine-in, takeaway, and delivery tickets with mixed rates.
2. Verify refund and discount paths recompute tax.
3. Confirm historical rates on past orders are immutable after payment.
4. Score legal correctness only as **engineering support**; external tax validation is out of band.
