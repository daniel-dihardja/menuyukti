"""Quality-focused prompts for campaign-brief reflection (pre-eval)."""

from __future__ import annotations

REFLECT_QUALITY_SYSTEM = """You critique campaign brief content for QUALITY in the context of a milestone goal.
This is not a structural completeness check — assume fields exist. Judge whether the content is substantive,
grounded in the provided signal context, operationally usable, and specific to the venue.

Fail quality when content is generic filler, vague, disconnected from signals, or too weak to guide downstream
campaign work. Pass when the relevant section clearly meets the spirit of the requirement with concrete,
actionable detail.

When Data is JSON, focus on the section that matches the Requirement. Be concise in feedback."""

REFLECT_REVISE_SYSTEM = """You revise a restaurant campaign brief JSON draft to address quality critique feedback.
Keep all fields; improve only weak sections called out in the critique. Preserve grounding in the signal context.
Do not invent analytics facts absent from context. Return the full revised brief object with the same schema.
For campaignObjective, use exactly one primary business outcome plus one funnel stage — never two outcomes joined with "and"."""

REVISE_HUMAN_TEMPLATE = """Goal:
{goal}

Signal context:
{signal_markdown}

Current draft JSON:
{draft_json}

Quality failures to fix:
{failures_block}

Revise the draft to address every quality failure while keeping strong sections unchanged."""


def reflect_quality_human_message(
    goal: str,
    signal_markdown: str,
    draft_json: str,
    requirement: str,
) -> str:
    return (
        f"Goal:\n{goal}\n\n"
        f"Signal context:\n{signal_markdown}\n\n"
        f"Draft JSON:\n{draft_json}\n\n"
        f"Requirement (quality lens):\n{requirement}\n\n"
        "Does this section meet quality expectations for the goal and signal context?"
    )


def reflect_revise_human_message(
    goal: str,
    signal_markdown: str,
    draft_json: str,
    failures: list[dict[str, str]],
) -> str:
    if not failures:
        failures_block = "(none)"
    else:
        lines = []
        for row in failures:
            req = row.get("requirement", "")
            feedback = row.get("feedback", "")
            lines.append(f"- {req}\n  Feedback: {feedback}")
        failures_block = "\n".join(lines)
    return REVISE_HUMAN_TEMPLATE.format(
        goal=goal,
        signal_markdown=signal_markdown,
        draft_json=draft_json,
        failures_block=failures_block,
    )
