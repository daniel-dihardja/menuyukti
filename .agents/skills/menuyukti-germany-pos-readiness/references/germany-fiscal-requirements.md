# German fiscal compliance — engineering checklist

**Regulatory reference version:** `1.0.0`  
**Last skill verification of sources:** `2026-10-12`  
**Confidence note:** Engineering implications only. Not legal advice. Flag items needing confirmation when sources cannot be re-verified.

## Authoritative sources

| ID          | Requirement area                                          | Source               | URL                                                                                                                                              | Effective / published              | Last verified             | Confidence | Open questions                                              |
| ----------- | --------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- | ------------------------- | ---------- | ----------------------------------------------------------- |
| REG-FIS-001 | §146a AO — certified TSE for electronic recording systems | BMF / AO             | https://ao.bundesfinanzministerium.de/ao/2026/Abgabenordnung/Vierter-Teil/Zweiter-Abschnitt/Erster-Unterabschnitt/Paragraf-146a/inhalt.html      | AO text as published on BMF portal | 2026-10-12                | high       | Scope of “electronic recording system” for cloud/hybrid POS |
| REG-FIS-002 | AEAO zu §146a — administrative interpretation             | BMF AEAO             | https://ao.bundesfinanzministerium.de/ao/2024/Abgabenordnung/Vierter-Teil/Zweiter-Abschnitt/Erster-Unterabschnitt/Paragraf-146a/ae-146a.html     | AEAO as published                  | 2026-10-12                | high       | Cloud TSE / multi-tenant mapping                            |
| REG-FIS-003 | KassenSichV                                               | BMF                  | https://ao.bundesfinanzministerium.de/ao/2024/Abgabenordnung/Vierter-Teil/Zweiter-Abschnitt/Erster-Unterabschnitt/Paragraf-146a/KassenSichV.html | As amended (check current BGBl)    | 2026-10-12                | high       | Receipt QR / DSFinV alignment for digital receipts          |
| REG-FIS-004 | BMF FAQ Kassengesetz / Belegausgabepflicht                | BMF FAQ              | https://www.bundesfinanzministerium.de/Content/DE/FAQ/FAQ-steuergerechtigkeit-belegpflicht.html                                                  | FAQ (non-binding orientation)      | 2026-10-12                | medium     | FAQ explicitly non-binding                                  |
| REG-FIS-005 | DSFinV-K export                                           | BZSt (portal)        | Search BZSt for current DSFinV-K package                                                                                                         | Version on BZSt                    | needs re-check each audit | medium     | Exact package URL/version must be confirmed each audit      |
| REG-FIS-006 | Cash-register notification (§146a Abs. 4 AO)              | BMF Ausfüllanleitung | https://www.bundesfinanzministerium.de/Content/DE/Downloads/Steuern/FAQ-Ausfuellanleitung.pdf?__blob=publicationFile&v=3                         | Stand 02.12.2024 (PDF)             | 2026-10-12                | medium     | ELSTER field mapping vs product metadata                    |
| REG-FIS-007 | GoBD auditability / retention                             | BMF GoBD             | Confirm current BMF GoBD circular each audit                                                                                                     | —                                  | needs re-check            | medium     | Retention vs product archival design                        |
| REG-FIS-008 | BSI TSE technical guidelines                              | BSI                  | Confirm current TR / protection profiles each audit                                                                                              | —                                  | needs re-check            | medium     | Provider certification vs MenuYukti integration             |

When network is available, re-open these URLs and update **Last verified**. If unreachable, set Confidence to `unverified` and mark related checks as needing confirmation.

## Engineering implications (what to look for in code)

Distinguish **implemented in product** vs **externally verified compliance** (certified TSE vendor, tax advisor sign-off, Finanzamt processes).

| Check ID | Capability                           | Technical implication                                                         | Typical MenuYukti touchpoints                                      |
| -------- | ------------------------------------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| FIS-01   | TSE integration architecture         | Port/adapter to certified TSE; env-controlled provider; no mock in production | `pos_fiscal_port.py`, `pos_fiscal_mock.py`, `pos_fiscalization.py` |
| FIS-02   | TSE transaction lifecycle            | Start / update / finish / cancel mapped to order lifecycle                    | `pos_fiscalization.py`, `pos_orders.py`                            |
| FIS-03   | Signature & fiscal metadata          | Persist TSE IDs, signatures, process type, timestamps, serials                | `pos_fiscal_process` model                                         |
| FIS-04   | TSE failure recovery                 | Defined behavior when TSE down; no silent “success”; retry/queue policy       | fiscalization error paths, flags like force-fail                   |
| FIS-05   | DSFinV-K export                      | Machine-readable export matching current DSFinV-K schema                      | export services / jobs (if any)                                    |
| FIS-06   | Immutable / protected fiscal records | Prevent silent mutation of signed fiscal data; corrections as new processes   | models + services + delete/clear guards                            |
| FIS-07   | Corrections & cancellations          | Void/cancel/refund fiscal flows distinct and auditable                        | refund/cancel in `pos_orders.py`                                   |
| FIS-08   | Fiscal receipt generation            | Receipt content includes required fiscal fields                               | receipt/print/PDF paths                                            |
| FIS-09   | Receipt issuance                     | Belegausgabepflicht supported (print or consented digital)                    | POS checkout UX + APIs                                             |
| FIS-10   | Retention / archival                 | Paid/refunded tickets protected from destructive clear                        | `location` delete, clear-service guards                            |
| FIS-11   | Cash-register notification support   | Data available for §146a Abs. 4 Mitteilung (registers, TSE serial, etc.)      | register models, admin exports                                     |
| FIS-12   | Traceability                         | Order ↔ payment ↔ fiscal process linkage                                      | FK relations, audit events                                         |
| FIS-13   | GoBD-related auditability            | Ordered, complete, evaluable records; export for Prüfung                      | audit events, exports                                              |
| FIS-14   | Production TSE provider              | Real certified provider path (not mock-only)                                  | config `POS_FISCAL_*`                                              |

## Audit guidance

1. Trace a **sale** from open ticket → pay → fiscal finish → receipt.
2. Trace a **refund** after fiscalization.
3. Trace **cancel** before finish.
4. Confirm mock adapters cannot be used in production configs without explicit gate.
5. Do not mark DSFinV-K as VERIFIED unless export artifacts and schema version evidence exist.
6. Do not treat “column exists” as compliance.
