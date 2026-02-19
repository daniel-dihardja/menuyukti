# Planning Workflow Epic Quality Gate v1

Use this checklist before generating stories from an epic.

## Metadata Gate
- [ ] Epic title is clear and outcome-oriented.
- [ ] `Epic ID` exists and follows `EPIC-<DOMAIN>-<TOPIC>`.
- [ ] `Status` is set (`Draft`, `In Progress`, or `Done`).

## Scope Gate
- [ ] `Goal` is singular and measurable.
- [ ] `In Scope` is explicit and bounded.
- [ ] `Out of Scope` is explicit to prevent spillover.

## Delivery Gate
- [ ] Story list exists and is dependency-ordered.
- [ ] Story names are implementation-actionable.
- [ ] Story sequence is realistic for incremental delivery.

## Quality Gate
- [ ] Acceptance criteria are verifiable.
- [ ] Risks and mitigations are documented.
- [ ] Required references (specs/contracts/blueprints) are linked where needed.

## Readiness Decision
- **Epic Ready**: all checklist items pass.
- **Epic Not Ready**: at least one checklist item fails; revise epic before generating stories.
