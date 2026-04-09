"""Runtime envelope for skill execution (templated env.* placeholders)."""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

from jinja2 import Environment


@dataclass(frozen=True)
class RunEnv:
    """Values available as `{{ env.* }}` in skill YAML."""

    milestone_id: str
    location_id: int
    user_id: str
    workflow_id: str = ""


def render_template(value: str, env: RunEnv) -> str:
    """Replace `{{ env.milestone_id }}`, `{{ env.location_id }}`, `{{ env.user_id }}`, `{{ env.workflow_id }}`."""
    return (
        value.replace("{{ env.milestone_id }}", str(env.milestone_id))
        .replace("{{ env.location_id }}", str(env.location_id))
        .replace("{{ env.user_id }}", str(env.user_id))
        .replace("{{ env.workflow_id }}", str(env.workflow_id))
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


def _jinja2_env() -> Environment:
    env = Environment()
    env.filters["tojson"] = lambda v, indent=None: json.dumps(v, indent=indent, ensure_ascii=False)
    return env


def render_human_message(template: str, context: dict[str, Any]) -> str:
    """Render SKILL ``human_message_template`` with prefetched ``context`` (Jinja2)."""
    return _jinja2_env().from_string(template).render(context=context)
