"""LangChain tools for milestone data (chat assistant)."""

from __future__ import annotations

import json
from copy import deepcopy
from typing import Annotated, Any, Literal

from agents_app.agents.core.chat.graphql_client import (
    fetch_milestone_node,
)
from agents_app.agents.core.chat.graphql_client import (
    update_milestone_input as persist_milestone_input,
)
from agents_app.agents.core.chat.graphql_client import (
    update_milestone_preset_data as persist_milestone_preset_data,
)
from agents_app.agents.core.chat.http_context import get_chat_http_client
from agents_app.agents.core.chat.milestone_help_copy import format_milestone_help_markdown
from agents_app.agents.core.chat.readable_payload import format_payload_for_chat
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output
from langchain_core.runnables import RunnableConfig
from langchain_core.tools import InjectedToolArg, tool

# Keys that belong on typed GraphQL columns; strip from ``data`` for the residual section.
_DATA_KEYS_STRIPPED_FOR_RESIDUAL = frozenset(
    {
        "goal",
        "milestoneGoal",
        "milestoneInput",
        "passCriterias",
        "milestonePresetData",
        "milestoneResult",
    },
)

_PRESET_TO_SKILL_ID: dict[str, str] = {
    "restaurant_campaign_brief": "campaign_brief",
    "promotion_candidates": "promotion_candidates",
    "menu_tagger": "menu_tagger",
    "menu_clusterer": "menu_clusterer",
    "post_lineup": "post_lineup",
    "scheduler": "scheduler",
    "culture_hooks": "culture_hooks",
    "ig_profile": "ig_profile",
    "dates": "dates",
    "public_holidays": "public_holidays",
}


def _format_json(data: Any) -> str:
    try:
        return json.dumps(data, ensure_ascii=False, indent=2)
    except (TypeError, ValueError):
        return repr(data)


def _residual_milestone_data(node: dict[str, Any]) -> dict[str, Any] | None:
    raw = node.get("data")
    if not isinstance(raw, dict) or not raw:
        return None
    out = {k: v for k, v in raw.items() if k not in _DATA_KEYS_STRIPPED_FOR_RESIDUAL}
    return out or None


def _validate_milestone_input_payload(preset_id: str, payload: Any) -> str | None:
    if not isinstance(payload, (dict, list)):
        return "milestoneInput must remain a JSON object or array."

    if isinstance(payload, dict):
        raw_type = payload.get("type")
        if raw_type is not None and not isinstance(raw_type, str):
            return "milestoneInput.type must be a string when provided."
        normalized_type = raw_type.strip() if isinstance(raw_type, str) else ""

        expected_types: dict[str, str] = {
            "campaign_brief": "campaign_brief",
            "culture_hooks": "culture_hooks",
            "promotion_candidates": "promotion_candidates",
            "menu_tagger": "menu_tagger",
            "menu_clusterer": "menu_clusterer",
            "post_lineup": "post_lineup",
            "scheduler": "scheduler",
            "ig_profile": "ig_profile",
            "dates": "dates",
            "public_holidays": "public_holidays",
        }
        expected_type = expected_types.get(preset_id)
        if expected_type and normalized_type and normalized_type != expected_type:
            return (
                "milestoneInput.type does not match milestone preset. "
                f"(expected={expected_type!r}, got={normalized_type!r})"
            )

        value = payload.get("value")
        if value is not None and not isinstance(value, dict):
            return "milestoneInput.value must be an object when provided."

        if isinstance(value, dict):
            notes = value.get("notes")
            if notes is not None and not isinstance(notes, str):
                return "milestoneInput.value.notes must be a string when provided."
            selected = value.get("selectedMenuCategories")
            if selected is not None:
                if not isinstance(selected, list):
                    return "milestoneInput.value.selectedMenuCategories must be an array when provided."
                for item in selected:
                    if not isinstance(item, str):
                        return (
                            "milestoneInput.value.selectedMenuCategories must contain "
                            "only strings when provided."
                        )
            for limit_key in ("starItemLimit", "puzzleItemLimit"):
                limit_val = value.get(limit_key)
                if limit_val is None:
                    continue
                if limit_val not in (5, 10, "all"):
                    return (
                        f"milestoneInput.value.{limit_key} must be 5, 10, or 'all' when provided."
                    )
            ignored = value.get("ignoredMenuItems")
            if ignored is not None:
                if not isinstance(ignored, list):
                    return "milestoneInput.value.ignoredMenuItems must be an array when provided."
                for item in ignored:
                    if not isinstance(item, str):
                        return (
                            "milestoneInput.value.ignoredMenuItems must contain "
                            "only strings when provided."
                        )
            reflection = value.get("reflection")
            if reflection is not None:
                if not isinstance(reflection, dict):
                    return "milestoneInput.value.reflection must be an object when provided."
                enabled = reflection.get("enabled")
                if enabled is not None and not isinstance(enabled, bool):
                    return (
                        "milestoneInput.value.reflection.enabled must be a boolean when provided."
                    )
                max_revisions = reflection.get("maxRevisions")
                if max_revisions is not None:
                    if not isinstance(max_revisions, int) or isinstance(max_revisions, bool):
                        return (
                            "milestoneInput.value.reflection.maxRevisions must be an "
                            "integer when provided."
                        )
                    if not (0 <= max_revisions <= 3):
                        return (
                            "milestoneInput.value.reflection.maxRevisions must be "
                            "between 0 and 3 when provided."
                        )

    return None


def _format_milestone_snapshot(milestone_id: str, node: dict[str, Any]) -> str:
    """Format milestone row fields returned by GraphQL (camelCase). No child nodes."""
    lines: list[str] = []
    lines.append("## Milestone")
    lines.append(f"- **id**: {milestone_id}")
    lines.append(f"- **name**: {node.get('name')!s}")
    lines.append(f"- **nodeType**: {node.get('nodeType')!s}")
    loc = node.get("locationId")
    if loc is not None:
        lines.append(f"- **locationId**: {loc}")

    goal = node.get("milestoneGoal")
    lines.append("")
    lines.append("## Goal")
    lines.append(goal.strip() if isinstance(goal, str) and goal.strip() else "(not set)")

    lines.append("")
    lines.append("## Input (milestoneInput)")
    inp = node.get("milestoneInput")
    if inp is None:
        lines.append("(not set)")
    else:
        lines.append(format_payload_for_chat(inp))

    lines.append("")
    lines.append("## Pass criteria")
    pc = node.get("passCriterias")
    if pc is None:
        lines.append("(not set)")
    elif not isinstance(pc, list):
        lines.append(_format_json(pc))
    elif len(pc) == 0:
        lines.append("(none)")
    else:
        for i, row in enumerate(pc, start=1):
            if isinstance(row, dict):
                cid = row.get("id", "")
                req = row.get("requirement", "")
                st = row.get("status", "")
                lines.append(f"{i}. id={cid!s} | status={st!s} | requirement: {req!s}")
            else:
                lines.append(f"{i}. {_format_json(row)}")

    lines.append("")
    lines.append("## Eval result (milestoneResult)")
    mr = node.get("milestoneResult")
    if mr is None:
        lines.append("(not set)")
    else:
        lines.append(_format_json(mr))

    lines.append("")
    lines.append("## Preset / result data (milestonePresetData)")
    mpd = node.get("milestonePresetData")
    if mpd is None:
        lines.append("(not set)")
    else:
        lines.append(format_payload_for_chat(mpd))

    residual = _residual_milestone_data(node)
    lines.append("")
    lines.append("## Other milestone.data")
    if residual is None:
        lines.append("(none)")
    else:
        lines.append(_format_json(residual))

    return "\n".join(lines)


def _milestone_context_from_config(
    config: RunnableConfig | None,
) -> tuple[str | None, int | None, str | None]:
    c = (config or {}).get("configurable") or {}
    milestone_id = c.get("milestone_id")
    location_id = c.get("location_id")
    user_id = c.get("user_id")
    return (
        str(milestone_id) if milestone_id is not None else None,
        int(location_id) if location_id is not None else None,
        str(user_id) if user_id is not None else None,
    )


async def _load_selected_milestone_node(
    config: RunnableConfig | None,
) -> tuple[dict[str, Any] | None, str | None]:
    milestone_id, location_id, user_id = _milestone_context_from_config(config)
    if not milestone_id or location_id is None or not user_id:
        return (
            None,
            "Milestone context is not available (no milestone selected or missing location). "
            "Ask the user to select a milestone first.",
        )
    client = get_chat_http_client()
    node = await fetch_milestone_node(milestone_id, user_id, client=client)
    if not node:
        return None, "Error: milestone not found."
    if str(node.get("nodeType") or "") != "milestone":
        return None, "Error: node is not a milestone."
    loc = node.get("locationId")
    if loc is not None and int(loc) != int(location_id):
        return None, "Error: milestone location does not match the campaign context."
    return node, None


def _format_json_shortcut_section(title: str, payload: Any) -> str:
    lines = [f"## {title}"]
    if payload is None:
        lines.append("(not set)")
    else:
        lines.append(format_payload_for_chat(payload))
    return "\n".join(lines)


def _decode_json_pointer_token(token: str) -> str:
    return token.replace("~1", "/").replace("~0", "~")


def _parse_json_pointer(path: str) -> tuple[list[str] | None, str | None]:
    p = path.strip()
    if not p:
        return None, "path must not be empty"
    if p == "/":
        return [""], None
    if not p.startswith("/"):
        return None, "path must start with '/'"
    tokens = [_decode_json_pointer_token(token) for token in p.split("/")[1:]]
    if not tokens:
        return None, "path must target at least one field"
    return tokens, None


def _encode_json_pointer_token(token: str) -> str:
    return token.replace("~", "~0").replace("/", "~1")


def _stringify_json_pointer(tokens: list[str]) -> str:
    if not tokens:
        return "/"
    return "/" + "/".join(_encode_json_pointer_token(token) for token in tokens)


def _normalize_milestone_input_path(path: str, payload: Any) -> str:
    """Allow shorthand top-level property paths to target milestoneInput.value fields.

    Examples:
    - /notes -> /value/notes
    - /endDate -> /value/endDate
    - /endDate/year -> /value/endDate/year
    """
    tokens, err = _parse_json_pointer(path)
    if err is not None or tokens is None:
        return path
    if tokens == [""]:
        return path
    if not isinstance(payload, dict):
        return path
    value = payload.get("value")
    if not isinstance(value, dict):
        return path
    if tokens[0] in payload:
        return path
    if tokens[0] not in value:
        return path
    return _stringify_json_pointer(["value", *tokens])


def _list_index_from_token(
    token: str, *, allow_end: bool, length: int
) -> tuple[int | None, str | None]:
    if token == "-" and allow_end:
        return length, None
    if not token.isdigit():
        return None, f"expected array index token, got {token!r}"
    idx = int(token)
    upper = length if allow_end else length - 1
    if idx < 0 or idx > upper:
        return None, f"array index {idx} out of range"
    return idx, None


def _resolve_parent_and_token(
    payload: Any,
    tokens: list[str],
) -> tuple[tuple[Any, str] | None, str | None]:
    current = payload
    for token in tokens[:-1]:
        if isinstance(current, dict):
            if token not in current:
                return None, f"path segment {token!r} not found"
            current = current[token]
            continue
        if isinstance(current, list):
            idx, err = _list_index_from_token(token, allow_end=False, length=len(current))
            if err is not None or idx is None:
                return None, err or "invalid array index"
            current = current[idx]
            continue
        return None, f"cannot traverse into non-container at segment {token!r}"
    return (current, tokens[-1]), None


def _apply_patch_operation(
    payload: Any,
    *,
    op: Literal["add", "remove", "replace"],
    path: str,
    value: Any | None,
) -> tuple[Any | None, str | None]:
    tokens, err = _parse_json_pointer(path)
    if err is not None or tokens is None:
        return None, err or "invalid path"

    if tokens == [""]:
        if op == "remove":
            return None, "cannot remove the root payload"
        return value, None

    resolved, err = _resolve_parent_and_token(payload, tokens)
    if err is not None or resolved is None:
        return None, err or "invalid path target"
    parent, token = resolved

    if isinstance(parent, dict):
        if op == "add":
            parent[token] = value
            return payload, None
        if op == "replace":
            if token not in parent:
                return None, f"path segment {token!r} not found for replace"
            parent[token] = value
            return payload, None
        if token not in parent:
            return None, f"path segment {token!r} not found for remove"
        parent.pop(token, None)
        return payload, None

    if isinstance(parent, list):
        if op == "add":
            idx, err = _list_index_from_token(token, allow_end=True, length=len(parent))
            if err is not None or idx is None:
                return None, err or "invalid array index"
            parent.insert(idx, value)
            return payload, None
        if op == "replace":
            idx, err = _list_index_from_token(token, allow_end=False, length=len(parent))
            if err is not None or idx is None:
                return None, err or "invalid array index"
            parent[idx] = value
            return payload, None
        idx, err = _list_index_from_token(token, allow_end=False, length=len(parent))
        if err is not None or idx is None:
            return None, err or "invalid array index"
        parent.pop(idx)
        return payload, None

    return None, "path target parent is not a JSON object or array"


@tool
async def get_milestone_data(config: Annotated[RunnableConfig, InjectedToolArg()]) -> str:
    """Load the selected milestone row: goal, input, pass criteria, eval result, and preset/structured data.

    All fields come from the milestone node (no child nodes). Call when the user asks about the
    currently selected milestone's inputs, outputs, criteria, or run payload."""
    c = config.get("configurable") or {}
    milestone_id = c.get("milestone_id")
    location_id = c.get("location_id")
    user_id = c.get("user_id")
    if not milestone_id or location_id is None or not user_id:
        return (
            "Milestone context is not available (no milestone selected or missing location). "
            "Answer from the conversation only, or ask the user to select a milestone."
        )
    client = get_chat_http_client()
    node = await fetch_milestone_node(str(milestone_id), str(user_id), client=client)
    if not node:
        return "Error: milestone not found."
    if str(node.get("nodeType") or "") != "milestone":
        return "Error: node is not a milestone."
    loc = node.get("locationId")
    if loc is not None and int(loc) != int(location_id):
        return "Error: milestone location does not match the campaign context."

    return _format_milestone_snapshot(str(milestone_id), node)


@tool
async def get_milestone_input_json(config: Annotated[RunnableConfig, InjectedToolArg()]) -> str:
    """Load only milestoneInput JSON for the selected milestone."""
    node, err = await _load_selected_milestone_node(config)
    if err is not None or node is None:
        return err or "Error: milestone not found."
    return _format_json_shortcut_section("Input (milestoneInput)", node.get("milestoneInput"))


@tool
async def get_milestone_preset_data_json(
    config: Annotated[RunnableConfig, InjectedToolArg()],
) -> str:
    """Load only milestonePresetData JSON for the selected milestone."""
    node, err = await _load_selected_milestone_node(config)
    if err is not None or node is None:
        return err or "Error: milestone not found."
    return _format_json_shortcut_section(
        "Preset data (milestonePresetData)",
        node.get("milestonePresetData"),
    )


@tool
async def get_milestone_preset_data_for_milestone(
    milestone_id: str,
    config: Annotated[RunnableConfig, InjectedToolArg()],
) -> str:
    """Load milestonePresetData for a milestone in the current workflow by id.

    Use when the user message is exactly ``/preset <id>`` with a numeric milestone id.
    The milestone must belong to the same workflow and location as the chat context."""
    target = str(milestone_id or "").strip()
    if not target or not target.isdigit():
        return "Error: milestone_id must be a non-empty numeric id."

    c = (config or {}).get("configurable") or {}
    workflow_id = c.get("workflow_id")
    location_id = c.get("location_id")
    user_id = c.get("user_id")

    if not workflow_id:
        return "Error: workflow context is missing (workflow_id). Cannot load another milestone."
    if location_id is None or not user_id:
        return (
            "Error: location or user context is missing. "
            "Cannot load milestone preset data outside a campaign chat."
        )

    client = get_chat_http_client()
    node = await fetch_milestone_node(target, str(user_id), client=client)
    if not node:
        return "Error: milestone not found."
    if str(node.get("nodeType") or "") != "milestone":
        return "Error: node is not a milestone."
    loc = node.get("locationId")
    if loc is not None and int(loc) != int(location_id):
        return "Error: milestone location does not match the campaign context."
    parent = node.get("parentId")
    if parent is None or str(parent) != str(workflow_id):
        return "Error: milestone does not belong to this workflow."

    raw_name = node.get("name")
    display = raw_name.strip() if isinstance(raw_name, str) and raw_name.strip() else target
    return _format_json_shortcut_section(
        f"Preset data — {display} (milestonePresetData)",
        node.get("milestonePresetData"),
    )


def _preset_id_from_milestone_node(node: dict[str, Any]) -> str | None:
    raw_data = node.get("data")
    milestone_node_data = raw_data if isinstance(raw_data, dict) else {}
    raw_preset = milestone_node_data.get("presetId")
    preset = raw_preset.strip() if isinstance(raw_preset, str) else ""
    return preset or None


@tool
async def get_milestone_help(config: Annotated[RunnableConfig, InjectedToolArg()]) -> str:
    """Return Help-tab style guidance for the selected milestone (what it does + optional input).

    Call when the user asks for milestone help or sends exactly ``/help``."""
    node, err = await _load_selected_milestone_node(config)
    if err is not None or node is None:
        return err or "Error: milestone not found."
    c = config.get("configurable") or {}
    milestone_id = c.get("milestone_id")
    name = node.get("name")
    title = str(name) if name is not None else str(milestone_id or "")
    goal = node.get("milestoneGoal")
    goal_str = goal.strip() if isinstance(goal, str) else None
    return format_milestone_help_markdown(
        name=title,
        preset_id=_preset_id_from_milestone_node(node),
        milestone_goal=goal_str,
    )


@tool
async def update_milestone_input(
    operations: list[dict[str, Any]] | None = None,
    dry_run: bool = False,
    config: Annotated[RunnableConfig, InjectedToolArg()] = None,  # type: ignore[assignment]
) -> str:
    """Apply partial updates to selected milestoneInput using JSON-pointer-like patch operations.

    Operation shape:
    - ``op``: ``add`` | ``replace`` | ``remove``
    - ``path``: JSON pointer (example: ``/value/notes``)
    - ``value``: required for ``add`` and ``replace``; ignored for ``remove``.
    """
    c = (config or {}).get("configurable") or {}
    milestone_id = c.get("milestone_id")
    location_id = c.get("location_id")
    user_id = c.get("user_id")
    if not milestone_id or location_id is None or not user_id:
        return (
            "Milestone context is not available (no milestone selected or missing location). "
            "Ask the user to select a milestone first."
        )
    if not isinstance(operations, list) or len(operations) == 0:
        return (
            "Missing required field 'operations'. Provide at least one patch operation, for example: "
            "[{'op':'replace','path':'/notes','value':'Test 1234'}]. "
            "Use '/notes' or '/value/notes' for notes, and '/endDate' or '/value/endDate' for endDate."
        )

    client = get_chat_http_client()
    node = await fetch_milestone_node(str(milestone_id), str(user_id), client=client)
    if not node:
        return "Error: milestone not found."
    if str(node.get("nodeType") or "") != "milestone":
        return "Error: node is not a milestone."
    loc = node.get("locationId")
    if loc is not None and int(loc) != int(location_id):
        return "Error: milestone location does not match the campaign context."

    raw_data = node.get("data")
    milestone_node_data = raw_data if isinstance(raw_data, dict) else {}
    raw_preset = milestone_node_data.get("presetId")
    preset_id = raw_preset.strip() if isinstance(raw_preset, str) else ""

    current_payload = node.get("milestoneInput")
    if current_payload is None:
        working_payload: Any = {}
    elif isinstance(current_payload, (dict, list)):
        working_payload = deepcopy(current_payload)
    else:
        return "Error: current milestoneInput is not a JSON object or array."

    for i, op_row in enumerate(operations, start=1):
        if not isinstance(op_row, dict):
            return f"Operation #{i} must be an object."
        op = str(op_row.get("op") or "").strip().lower()
        if op not in {"add", "replace", "remove"}:
            return f"Operation #{i} has unsupported op {op!r}."
        path = op_row.get("path")
        if not isinstance(path, str):
            return f"Operation #{i} requires string field 'path'."
        normalized_path = _normalize_milestone_input_path(path, working_payload)
        if op in {"add", "replace"} and "value" not in op_row:
            return f"Operation #{i} requires 'value' for op={op!r}."
        value = op_row.get("value")
        next_payload, err = _apply_patch_operation(
            working_payload,
            op=op,  # type: ignore[arg-type]
            path=normalized_path,
            value=value,
        )
        if err is not None or next_payload is None:
            return f"Operation #{i} failed: {err or 'invalid operation'}"
        working_payload = next_payload

    validation_error = _validate_milestone_input_payload(preset_id, working_payload)
    if validation_error is not None:
        return f"Patched milestoneInput is invalid. Validation error: {validation_error}"

    if dry_run:
        return (
            f"Validated {len(operations)} operation(s) for milestoneInput "
            f"(presetId={preset_id or 'unknown'}). No data was saved because dry_run=true."
        )

    await persist_milestone_input(
        str(milestone_id),
        working_payload,
        str(user_id),
        client=client,
    )
    return (
        f"Saved milestoneInput for milestone id={milestone_id} with {len(operations)} operation(s)."
    )


@tool
async def update_milestone_preset_data(
    operations: list[dict[str, Any]],
    dry_run: bool = False,
    config: Annotated[RunnableConfig, InjectedToolArg()] = None,  # type: ignore[assignment]
) -> str:
    """Apply partial updates to selected milestonePresetData using JSON-pointer-like patch operations.

    Operation shape:
    - ``op``: ``add`` | ``replace`` | ``remove``
    - ``path``: JSON pointer (example: ``/intersections/1/topic``)
    - ``value``: required for ``add`` and ``replace``; ignored for ``remove``.
    """
    c = (config or {}).get("configurable") or {}
    milestone_id = c.get("milestone_id")
    location_id = c.get("location_id")
    user_id = c.get("user_id")
    if not milestone_id or location_id is None or not user_id:
        return (
            "Milestone context is not available (no milestone selected or missing location). "
            "Ask the user to select a milestone first."
        )
    if not isinstance(operations, list) or len(operations) == 0:
        return "At least one patch operation is required."

    client = get_chat_http_client()
    node = await fetch_milestone_node(str(milestone_id), str(user_id), client=client)
    if not node:
        return "Error: milestone not found."
    if str(node.get("nodeType") or "") != "milestone":
        return "Error: node is not a milestone."
    loc = node.get("locationId")
    if loc is not None and int(loc) != int(location_id):
        return "Error: milestone location does not match the campaign context."

    raw_data = node.get("data")
    milestone_node_data = raw_data if isinstance(raw_data, dict) else {}
    raw_preset = milestone_node_data.get("presetId")
    preset_id = raw_preset.strip() if isinstance(raw_preset, str) else ""
    skill_id = _PRESET_TO_SKILL_ID.get(preset_id)
    if not skill_id:
        return (
            "Error: this milestone preset is not supported for partial chat updates yet. "
            f"(presetId={preset_id or 'unknown'})"
        )

    current_payload = node.get("milestonePresetData")
    if current_payload is None:
        working_payload: Any = {}
    elif isinstance(current_payload, (dict, list)):
        working_payload = deepcopy(current_payload)
    else:
        return "Error: current milestonePresetData is not a JSON object or array."

    for i, op_row in enumerate(operations, start=1):
        if not isinstance(op_row, dict):
            return f"Operation #{i} must be an object."
        op = str(op_row.get("op") or "").strip().lower()
        if op not in {"add", "replace", "remove"}:
            return f"Operation #{i} has unsupported op {op!r}."
        path = op_row.get("path")
        if not isinstance(path, str):
            return f"Operation #{i} requires string field 'path'."
        if op in {"add", "replace"} and "value" not in op_row:
            return f"Operation #{i} requires 'value' for op={op!r}."
        value = op_row.get("value")
        next_payload, err = _apply_patch_operation(
            working_payload,
            op=op,  # type: ignore[arg-type]
            path=path,
            value=value,
        )
        if err is not None or next_payload is None:
            return f"Operation #{i} failed: {err or 'invalid operation'}"
        working_payload = next_payload

    normalized, validation_error = validate_skill_output(skill_id, working_payload)
    if validation_error is not None or normalized is None:
        return (
            "Patched data is invalid for this milestone preset. "
            f"Validation error: {validation_error or 'unknown error'}"
        )

    if dry_run:
        return (
            f"Validated {len(operations)} operation(s) for preset '{skill_id}'. "
            "No data was saved because dry_run=true."
        )

    await persist_milestone_preset_data(
        str(milestone_id),
        normalized,
        str(user_id),
        client=client,
    )
    return (
        f"Saved milestonePresetData for milestone id={milestone_id} "
        f"with {len(operations)} operation(s)."
    )
