# GDPR technical controls and security engineering checklist

**Regulatory reference version:** `1.0.0`  
**Last skill verification of sources:** `2026-10-12`

Separate **technical implementation** (this audit) from **legal/organizational** obligations (DPA, ROPA, DPIA, contracts). Do not claim GDPR compliance from engineering alone.

## Authoritative sources

| ID          | Requirement area               | Source                        | URL                                           | Last verified  | Confidence | Open questions                                              |
| ----------- | ------------------------------ | ----------------------------- | --------------------------------------------- | -------------- | ---------- | ----------------------------------------------------------- |
| REG-GDP-001 | GDPR (EU) 2016/679             | EUR-Lex                       | https://eur-lex.europa.eu/eli/reg/2016/679/oj | 2026-10-12     | high       | Role of MenuYukti as controller vs processor per deployment |
| REG-GDP-002 | German BDSG                    | Gesetze im Internet           | https://www.gesetze-im-internet.de/bdsg_2018/ | needs re-check | medium     | National specifics for employment/POS staff data            |
| REG-GDP-003 | Supervisory authority guidance | e.g. BfDI / Landesbeauftragte | Confirm relevant LDI for hosting/customers    | needs re-check | medium     | Cross-border transfer tools                                 |

## Technical checks — security

| Check ID | Capability                 | Look for                                                          |
| -------- | -------------------------- | ----------------------------------------------------------------- |
| SEC-01   | Authentication             | Clerk/session enforcement on POS mutations/queries                |
| SEC-02   | Authorization              | Role checks for refunds, voids, fiscal exports, admin             |
| SEC-03   | RBAC                       | Documented roles; least privilege in resolvers/services           |
| SEC-04   | Tenant isolation           | Location/org scoping on every POS read/write; no cross-tenant IDs |
| SEC-05   | Encryption in transit      | TLS for GraphQL, payments, TSE                                    |
| SEC-06   | Encryption at rest         | DB/disk/backup encryption evidence (infra docs or config)         |
| SEC-07   | Secrets management         | No secrets in repo; env/secret store; rotation path               |
| SEC-08   | Sensitive data logging     | No PANs, full card data, secrets, unnecessary PII in logs         |
| SEC-09   | API security               | Authn/z on mutations; input validation; rate limits if applicable |
| SEC-10   | Dependency vulnerabilities | Known critical CVEs in lockfiles / CI scans                       |
| SEC-11   | Administrative access      | Break-glass controls; audit of admin actions                      |
| SEC-12   | Backup security            | Encrypted backups; access control; restore tested                 |

## Technical checks — GDPR / personal data

| Check ID | Capability                  | Look for                                                             |
| -------- | --------------------------- | -------------------------------------------------------------------- |
| GDP-01   | Personal data inventory     | What POS stores (staff, customer, loyalty, device IDs)               |
| GDP-02   | Data minimization           | Only fields needed for POS/fiscal ops                                |
| GDP-03   | Retention & deletion        | Capability to delete/anonymize subject to fiscal retention conflicts |
| GDP-04   | Data subject rights support | Export/erase/access hooks or documented process + tooling            |
| GDP-05   | Third-party processors      | Payment, TSE, hosting, analytics — documented integrations           |
| GDP-06   | International transfers     | Hosting region; transfer mechanisms if non-EEA                       |
| GDP-07   | Fiscal vs privacy conflict  | Documented precedence when retention blocks erasure                  |

## Audit guidance

1. Attempt to map a cross-tenant access path (IDOR-style) via POS APIs — report as finding if present.
2. Grep logs/formatters for card/PII leakage patterns.
3. Confirm fiscal retention does not silently equal “we never delete anything” without policy notes.
4. Unverified mandatory security controls → cannot unconditional GO.
