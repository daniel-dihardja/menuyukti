# Planning Workflow Gap and Fixback Log v1

## Gap Log

| ID | Gap | Severity | Impact | Recommended Fix |
|---|---|---|---|---|
| GAP-01 | Metadata completeness is manual (no linting) | Medium | Inconsistent story/epic quality | Add lightweight markdown validation script in future iteration |
| GAP-02 | Closure commit conventions rely on user memory | Medium | Risk of non-atomic closure commits | Add command quick-reference card and optional pre-commit helper |
| GAP-03 | Reopen workflow for done stories/epics not surfaced in quick flow docs | Low | Inconsistent reopening behavior | Add reopen cheat sheet section in adoption guide |
| GAP-04 | Cross-project setup still requires manual path verification | Low | Slower first-time onboarding | Add one-page startup checklist for new repos |

## Fixback Backlog (Prioritized)

1. **FB-01 (High ROI)**  
Create markdown metadata validator for epic/story required fields (`GAP-01`).

2. **FB-02 (High ROI)**  
Add closure commit command snippets to adoption guide quick-start (`GAP-02`).

3. **FB-03 (Medium ROI)**  
Add explicit reopen examples for story/epic in lifecycle docs (`GAP-03`).

4. **FB-04 (Medium ROI)**  
Publish new-repo onboarding checklist with path/config verification (`GAP-04`).
