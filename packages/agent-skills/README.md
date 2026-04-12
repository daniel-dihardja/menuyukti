# agent-skills

**Obsolete (scheduled for removal).** Runtime milestone `SKILL.md` files for **legacy** Prepare flows that still declare a `menuyukti` prefetch block. **New and migrated skills** live under [`apps/agents/agents/core/milestone_run/skills/`](../../apps/agents/agents/core/milestone_run/skills/) only; [`get_prepare_skill_path`](../../apps/agents/agents/core/milestone_run/skill_paths.py) logs a warning when resolving through this package.

Do not add new skills here. **`restaurant_brand_brief`** and **`promotion_candidates`** are already served from `apps/agents/.../milestone_run/skills/` (tool-based Prepare + run); the copies under `src/agent_skills/skills/` are stale references only. Migrate remaining folders to `milestone_run/skills`, then delete this package and the `get_skill_path` fallback.

- Resolve paths (legacy): `from agent_skills import get_skill_path, list_skill_ids`
- Orchestration stays in **`apps/agents`**, not in this package.
