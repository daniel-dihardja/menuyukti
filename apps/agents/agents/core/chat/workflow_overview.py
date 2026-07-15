"""Format workflow milestone index for chat discovery tools and system prompt."""

from __future__ import annotations

from typing import Any

from agents_app.agents.core.chat.milestone_help_copy import resolve_what_it_does


def _preset_id_from_node_data(data: Any) -> str | None:
    if not isinstance(data, dict):
        return None
    raw = data.get("presetId")
    preset = raw.strip() if isinstance(raw, str) else ""
    return preset or None


def _milestone_rows_from_tree(tree: dict[str, Any]) -> list[dict[str, Any]]:
    raw_milestones = tree.get("milestones")
    if not isinstance(raw_milestones, list):
        return []
    rows: list[dict[str, Any]] = []
    for bundle in raw_milestones:
        if not isinstance(bundle, dict):
            continue
        milestone = bundle.get("milestone")
        if isinstance(milestone, dict):
            rows.append(milestone)
    return rows


def format_workflow_milestone_index_compact(
    tree: dict[str, Any],
    *,
    selected_milestone_id: str | None = None,
) -> str:
    """Compact id + name + presetId list for system prompt injection."""
    workflow = tree.get("workflow")
    wf_name = ""
    if isinstance(workflow, dict):
        raw_name = workflow.get("name")
        wf_name = raw_name.strip() if isinstance(raw_name, str) else ""

    lines: list[str] = ["## Current workflow milestones"]
    if wf_name:
        lines.append(f"Workflow: {wf_name}")
    lines.append("")

    milestones = _milestone_rows_from_tree(tree)
    if not milestones:
        lines.append("(no milestones)")
        return "\n".join(lines)

    for i, milestone in enumerate(milestones, start=1):
        mid = str(milestone.get("id") or "")
        raw_name = milestone.get("name")
        name = raw_name.strip() if isinstance(raw_name, str) and raw_name.strip() else mid
        preset_id = _preset_id_from_node_data(milestone.get("data")) or "(no preset)"
        selected = selected_milestone_id is not None and mid == str(selected_milestone_id)
        marker = " (selected)" if selected else ""
        lines.append(f"{i}. id={mid} | {name} | preset={preset_id}{marker}")

    return "\n".join(lines)


def format_workflow_overview_markdown(
    tree: dict[str, Any],
    *,
    selected_milestone_id: str | None = None,
) -> str:
    """Full workflow overview with per-milestone help summaries."""
    workflow = tree.get("workflow")
    wf_id = ""
    wf_name = ""
    if isinstance(workflow, dict):
        wf_id = str(workflow.get("id") or "")
        raw_name = workflow.get("name")
        wf_name = raw_name.strip() if isinstance(raw_name, str) else ""

    lines: list[str] = ["# Workflow overview"]
    if wf_name or wf_id:
        title = wf_name or f"Workflow {wf_id}"
        lines.append(f"**{title}**" + (f" (id={wf_id})" if wf_id else ""))
    lines.append("")
    lines.append(
        "Use milestone ids below with get_milestone_data, get_milestone_input_json, "
        "get_milestone_preset_data_json, or get_milestone_help when fetching a specific step."
    )
    lines.append("")

    milestones = _milestone_rows_from_tree(tree)
    if not milestones:
        lines.append("(no milestones in this workflow)")
        return "\n".join(lines)

    for i, milestone in enumerate(milestones, start=1):
        mid = str(milestone.get("id") or "")
        raw_name = milestone.get("name")
        name = raw_name.strip() if isinstance(raw_name, str) and raw_name.strip() else mid
        preset_id = _preset_id_from_node_data(milestone.get("data"))
        goal = milestone.get("milestoneGoal")
        goal_str = goal.strip() if isinstance(goal, str) else None
        summary = resolve_what_it_does(preset_id, goal_str)
        selected = selected_milestone_id is not None and mid == str(selected_milestone_id)
        selected_note = " **(selected in UI)**" if selected else ""

        lines.append(f"## {i}. {name}{selected_note}")
        lines.append(f"- **id**: {mid}")
        if preset_id:
            lines.append(f"- **presetId**: {preset_id}")
        lines.append(f"- **summary**: {summary}")
        lines.append("")

    return "\n".join(lines).rstrip() + "\n"
