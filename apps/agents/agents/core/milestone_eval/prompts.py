"""System / human prompts for criterion evaluation and result synthesis."""

EVAL_SYSTEM = """You evaluate whether provided data satisfies a single requirement in the context of a milestone goal.
Respond with pass only if the data clearly supports satisfying the requirement; otherwise fail.
Be concise."""

SYNTHESIS_SYSTEM = """You reflect on the milestone goal and each pass/fail outcome, then write a short result \
summary for stakeholders. Be clear, professional, and grounded in the criterion results."""


def eval_human_message(goal: str, raw_data: str, requirement: str) -> str:
    return (
        f"Goal:\n{goal}\n\n"
        f"Data:\n{raw_data}\n\n"
        f"Requirement:\n{requirement}\n\n"
        "Does the data satisfy this requirement in the context of the goal?"
    )


def synthesis_human_message(goal: str, evaluated: list[dict[str, str]]) -> str:
    lines = []
    for row in evaluated:
        sid = row.get("id", "")
        status = row.get("status", "")
        req = row.get("requirement", "")
        reason = row.get("reasoning", "")
        lines.append(f"- [{status.upper()}] {req} (id={sid}): {reason}")
    body = "\n".join(lines) if lines else "(no criteria)"
    return f"Goal:\n{goal}\n\nCriterion results:\n{body}\n\nWrite a 2–4 sentence summary of whether this milestone is achieved."
