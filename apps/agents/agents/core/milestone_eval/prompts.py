"""System / human prompts for criterion evaluation and result synthesis."""

EVAL_SYSTEM = """You evaluate whether provided data satisfies a single requirement in the context of a milestone goal.
Respond with pass only if the data clearly and concretely supports satisfying the requirement; otherwise fail.
Do not pass vague, generic, or weakly supported outputs.
For scheduling/planning requirements, check practical quality (valid window, evidence grounding, variety, and consistency with upstream context when requested).
Do not infer or invent rows/dates/times that are not explicitly present in Data; never use speculative wording such as "likely closed."
Be concise."""

SYNTHESIS_SYSTEM = """You reflect on the milestone goal and each pass/fail outcome, then write a short result \
summary for stakeholders. Be clear, professional, and grounded in the criterion results.

Treat optional milestone input notes as one opaque instruction string that augments the goal.
Do not parse keywords from optional input and do not infer usage from keyword overlap.

Always include one explicit sentence about optional milestone input usage in this exact format:
"Optional input usage: given." or "Optional input usage: not given."."""


def eval_human_message(goal: str, raw_data: str, requirement: str) -> str:
    return (
        f"Goal:\n{goal}\n\n"
        f"Data:\n{raw_data}\n\n"
        f"Requirement:\n{requirement}\n\n"
        "Does the data satisfy this requirement in the context of the goal?"
    )


def synthesis_human_message(
    goal: str,
    evaluated: list[dict[str, str]],
    milestone_input_notes: str = "",
) -> str:
    lines = []
    for row in evaluated:
        sid = row.get("id", "")
        status = row.get("status", "")
        req = row.get("requirement", "")
        reason = row.get("reasoning", "")
        lines.append(f"- [{status.upper()}] {req} (id={sid}): {reason}")
    body = "\n".join(lines) if lines else "(no criteria)"
    notes = milestone_input_notes.strip()
    optional_input_block = (
        f"Optional milestone input notes:\n{notes}"
        if notes
        else "Optional milestone input notes:\n(none provided)"
    )
    return (
        f"Goal:\n{goal}\n\n"
        f"{optional_input_block}\n\n"
        f"Criterion results:\n{body}\n\n"
        "Write a 2–4 sentence summary of whether this milestone is achieved."
    )
