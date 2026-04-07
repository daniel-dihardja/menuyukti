"""Runtime envelope for skill execution (templated env.* placeholders)."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class RunEnv:
    """Values available as `{{ env.* }}` in skill YAML."""

    milestone_id: str
    location_id: int
    user_id: str


def render_template(value: str, env: RunEnv) -> str:
    """Replace `{{ env.milestone_id }}`, `{{ env.location_id }}`, `{{ env.user_id }}`."""
    return (
        value.replace("{{ env.milestone_id }}", str(env.milestone_id))
        .replace("{{ env.location_id }}", str(env.location_id))
        .replace("{{ env.user_id }}", str(env.user_id))
    )


def render_inputs(inputs: dict[str, str], env: RunEnv) -> dict[str, object]:
    """Render all string values; coerce `location_id` to int when key name matches."""
    out: dict[str, object] = {}
    for key, raw in inputs.items():
        rendered = render_template(raw, env)
        if key == "location_id" and rendered.isdigit():
            out[key] = int(rendered)
        else:
            out[key] = rendered
    return out
