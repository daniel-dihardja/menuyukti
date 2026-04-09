# agent-skills

Runtime milestone **`SKILL.md`** files for the Menuyukti agents service (`apps/agents`). Each skill is a folder under `src/agent_skills/skills/<skill_id>/SKILL.md` with YAML frontmatter and Markdown body consumed by `skill_runner`.

- Resolve paths: `from agent_skills import get_skill_path, list_skill_ids`
- Orchestration (prefetch, LLM, persist) stays in **`apps/agents`**, not in this package.
