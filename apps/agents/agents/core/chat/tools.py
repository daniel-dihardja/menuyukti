"""LangChain tools for milestone data (chat assistant)."""

from __future__ import annotations

import json
from copy import deepcopy
from typing import Annotated, Any, Literal

from agents_app.agents.core.chat.chart_data import (
    CHART_IDS,
    is_chart_id,
    load_chart_data_markdown,
)
from agents_app.agents.core.chat.graphql_client import (
    fetch_milestone_node,
    fetch_workflow_campaign_tree,
)
from agents_app.agents.core.chat.graphql_client import (
    update_milestone_input as persist_milestone_input,
)
from agents_app.agents.core.chat.http_context import get_chat_http_client
from agents_app.agents.core.chat.instagram_items_client import (
    create_instagram_item as persist_create_instagram_item,
)
from agents_app.agents.core.chat.instagram_items_client import (
    delete_instagram_item as persist_delete_instagram_item,
)
from agents_app.agents.core.chat.instagram_items_client import (
    fetch_instagram_item,
)
from agents_app.agents.core.chat.instagram_items_client import (
    list_instagram_items as fetch_instagram_items,
)
from agents_app.agents.core.chat.instagram_items_client import (
    update_instagram_item as persist_update_instagram_item,
)
from agents_app.agents.core.chat.milestone_help_copy import format_milestone_help_markdown
from agents_app.agents.core.chat.readable_payload import format_payload_for_chat
from agents_app.agents.core.chat.workflow_overview import format_workflow_overview_markdown
from agents_app.agents.core.location_page_format import format_location_page_markdown
from agents_app.agents.graphql_base import graphql_post
from agents_app.agents.graphql_operations import (
    LOCATION_QUERY,
    MILESTONE_HELP_QUERY,
    MILESTONE_INPUT_QUERY,
    MILESTONE_PRESET_DATA_QUERY,
    NODE_BY_ID_QUERY,
)
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

_VALID_IG_KINDS = frozenset({"story", "post", "reel"})
_VALID_IG_STATUSES = frozenset({"draft", "ready"})
_IG_CREATE_OPTIONAL_KEYS = frozenset(
    {"title", "caption", "hook", "visual_brief", "status", "schedule"}
)
_IG_UPDATE_OPTIONAL_KEYS = frozenset(
    {"kind", "title", "caption", "hook", "visual_brief", "status", "schedule"}
)


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
            "scheduler": "scheduler",
            "ig_profile": "ig_profile",
            "ig_plan": "ig_plan",
            "ig_menu_picker": "ig_menu_picker",
            "ig_format": "ig_format",
            "ig_text": "ig_text",
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


MilestoneField = Literal["goal", "input", "data", "help", "criteria", "eval", "meta"]
_DEFAULT_MILESTONE_FIELDS: tuple[MilestoneField, ...] = ("goal", "input", "data")
_VALID_MILESTONE_FIELDS: frozenset[str] = frozenset(
    {"goal", "input", "data", "help", "criteria", "eval", "meta"}
)


def _preset_id_from_milestone_node(node: dict[str, Any]) -> str | None:
    raw_data = node.get("data")
    milestone_node_data = raw_data if isinstance(raw_data, dict) else {}
    raw_preset = milestone_node_data.get("presetId")
    preset = raw_preset.strip() if isinstance(raw_preset, str) else ""
    return preset or None


def _normalize_milestone_fields(
    fields: list[str] | None,
) -> tuple[list[MilestoneField] | None, str | None]:
    if fields is None or len(fields) == 0:
        return list(_DEFAULT_MILESTONE_FIELDS), None
    normalized: list[MilestoneField] = []
    seen: set[str] = set()
    for raw in fields:
        key = str(raw).strip().lower()
        if key not in _VALID_MILESTONE_FIELDS:
            return None, (
                f"Error: unsupported field {raw!r}. "
                "Use goal, input, data, help, criteria, eval, and/or meta."
            )
        if key in seen:
            continue
        seen.add(key)
        normalized.append(key)  # type: ignore[arg-type]
    return normalized, None


def _query_for_milestone_fields(fields: list[MilestoneField]) -> tuple[str, str]:
    """Return ``(graphql_query, cache_key)`` for the requested projections."""
    field_set = set(fields)
    if field_set == {"input"}:
        return MILESTONE_INPUT_QUERY, "input"
    if field_set == {"data"}:
        return MILESTONE_PRESET_DATA_QUERY, "preset"
    if field_set == {"help"}:
        return MILESTONE_HELP_QUERY, "help"
    return NODE_BY_ID_QUERY, "full"


def _format_meta_section(milestone_id: str, node: dict[str, Any]) -> str:
    lines = [
        "## Milestone",
        f"- **id**: {milestone_id}",
        f"- **name**: {node.get('name')!s}",
        f"- **nodeType**: {node.get('nodeType')!s}",
    ]
    loc = node.get("locationId")
    if loc is not None:
        lines.append(f"- **locationId**: {loc}")
    return "\n".join(lines)


def _format_goal_section(node: dict[str, Any]) -> str:
    goal = node.get("milestoneGoal")
    body = goal.strip() if isinstance(goal, str) and goal.strip() else "(not set)"
    return f"## Goal\n{body}"


def _format_input_section(node: dict[str, Any]) -> str:
    return _format_json_shortcut_section("Input (milestoneInput)", node.get("milestoneInput"))


def _format_data_section(node: dict[str, Any], *, milestone_id: str | None = None) -> str:
    title = "Preset data (milestonePresetData)"
    if milestone_id is not None:
        raw_name = node.get("name")
        display = (
            raw_name.strip() if isinstance(raw_name, str) and raw_name.strip() else milestone_id
        )
        title = f"Preset data — {display} (milestonePresetData)"
    return _format_json_shortcut_section(title, node.get("milestonePresetData"))


def _format_criteria_section(node: dict[str, Any]) -> str:
    lines = ["## Pass criteria"]
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
    return "\n".join(lines)


def _format_eval_section(node: dict[str, Any]) -> str:
    lines = ["## Eval result (milestoneResult)"]
    mr = node.get("milestoneResult")
    if mr is None:
        lines.append("(not set)")
    else:
        lines.append(_format_json(mr))
    return "\n".join(lines)


def _format_help_section(milestone_id: str, node: dict[str, Any]) -> str:
    name = node.get("name")
    title = str(name) if name is not None else str(milestone_id)
    goal = node.get("milestoneGoal")
    goal_str = goal.strip() if isinstance(goal, str) else None
    return format_milestone_help_markdown(
        name=title,
        preset_id=_preset_id_from_milestone_node(node),
        milestone_goal=goal_str,
    )


def _format_meta_residual_section(node: dict[str, Any]) -> str:
    residual = _residual_milestone_data(node)
    lines = ["## Other milestone.data"]
    if residual is None:
        lines.append("(none)")
    else:
        lines.append(_format_json(residual))
    return "\n".join(lines)


def _format_milestone_fields(
    milestone_id: str,
    node: dict[str, Any],
    fields: list[MilestoneField],
    *,
    explicit_milestone_id: bool,
) -> str:
    sections: list[str] = []
    for field in fields:
        if field == "meta":
            sections.append(_format_meta_section(milestone_id, node))
            sections.append(_format_meta_residual_section(node))
        elif field == "goal":
            sections.append(_format_goal_section(node))
        elif field == "input":
            sections.append(_format_input_section(node))
        elif field == "data":
            sections.append(
                _format_data_section(
                    node,
                    milestone_id=milestone_id if explicit_milestone_id else None,
                )
            )
        elif field == "criteria":
            sections.append(_format_criteria_section(node))
        elif field == "eval":
            sections.append(_format_eval_section(node))
        elif field == "help":
            sections.append(_format_help_section(milestone_id, node))
    return "\n\n".join(sections)


def _milestone_context_from_config(
    config: RunnableConfig | None,
) -> tuple[str | None, int | None, str | None, str | None]:
    c = (config or {}).get("configurable") or {}
    milestone_id = c.get("milestone_id")
    location_id = c.get("location_id")
    user_id = c.get("user_id")
    workflow_id = c.get("workflow_id")
    return (
        str(milestone_id) if milestone_id is not None else None,
        int(location_id) if location_id is not None else None,
        str(user_id) if user_id is not None else None,
        str(workflow_id) if workflow_id is not None else None,
    )


def _normalize_explicit_milestone_id(milestone_id: str | None) -> tuple[str | None, str | None]:
    if milestone_id is None:
        return None, None
    target = str(milestone_id).strip()
    if not target:
        return None, "Error: milestone_id must be a non-empty numeric id."
    if not target.isdigit():
        return None, "Error: milestone_id must be a non-empty numeric id."
    return target, None


async def _load_milestone_for_chat(
    config: RunnableConfig | None,
    *,
    milestone_id: str | None = None,
    query: str = NODE_BY_ID_QUERY,
    cache_key: str | None = "full",
) -> tuple[str | None, dict[str, Any] | None, str | None]:
    """Load and validate a milestone for chat reads.

    Returns ``(resolved_milestone_id, node, error_message)``.
    """
    selected_id, location_id, user_id, workflow_id = _milestone_context_from_config(config)
    explicit, explicit_err = _normalize_explicit_milestone_id(milestone_id)
    if explicit_err is not None:
        return None, None, explicit_err

    target_id = explicit or selected_id
    if not target_id or location_id is None or not user_id:
        if explicit:
            return (
                None,
                None,
                "Error: location or user context is missing. "
                "Cannot load milestone data outside a campaign chat.",
            )
        return (
            None,
            None,
            "Milestone context is not available (no milestone selected or missing location). "
            "Ask the user to select a milestone first, or call get_workflow_overview "
            "to list milestones in the workflow.",
        )

    if not workflow_id and explicit and (not selected_id or explicit != selected_id):
        return (
            None,
            None,
            "Error: workflow context is missing (workflow_id). "
            "Cannot load another milestone without a workflow scope.",
        )

    client = get_chat_http_client()
    node = await fetch_milestone_node(
        target_id,
        user_id,
        client=client,
        query=query,
        cache_key=cache_key,
    )
    if not node:
        return None, None, "Error: milestone not found."
    if str(node.get("nodeType") or "") != "milestone":
        return None, None, "Error: node is not a milestone."
    loc = node.get("locationId")
    if loc is not None and int(loc) != int(location_id):
        return None, None, "Error: milestone location does not match the campaign context."

    if workflow_id:
        parent = node.get("parentId")
        if parent is None or str(parent) != str(workflow_id):
            return None, None, "Error: milestone does not belong to this workflow."

    return target_id, node, None


async def _load_selected_milestone_node(
    config: RunnableConfig | None,
) -> tuple[dict[str, Any] | None, str | None]:
    _target_id, node, err = await _load_milestone_for_chat(config)
    if err is not None:
        return None, err
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
async def get_workflow_overview(
    config: Annotated[RunnableConfig, InjectedToolArg()],
) -> str:
    """Refresh the workflow milestone list: id, name, presetId, and short help summary.

    Prefer the Workflow milestone catalog already in the system message. Call this only when that
    catalog is missing/unavailable, or the user implies the pipeline changed and you need a fresh
    list. Then fetch details with get_milestone using ids from the result."""
    c = (config or {}).get("configurable") or {}
    workflow_id = c.get("workflow_id")
    location_id = c.get("location_id")
    user_id = c.get("user_id")
    selected_milestone_id = c.get("milestone_id")

    if not workflow_id:
        return (
            "Error: workflow context is missing (workflow_id). "
            "Open campaign workflow chat to inspect milestones across the pipeline."
        )
    if location_id is None or not user_id:
        return (
            "Error: location or user context is missing. "
            "Cannot load workflow overview outside a campaign chat."
        )

    client = get_chat_http_client()
    tree = await fetch_workflow_campaign_tree(str(workflow_id), str(user_id), client=client)
    if not tree:
        return "Error: workflow not found or access denied."

    workflow = tree.get("workflow")
    if isinstance(workflow, dict):
        wf_loc = workflow.get("locationId")
        if wf_loc is not None and int(wf_loc) != int(location_id):
            return "Error: workflow location does not match the campaign context."

    selected = str(selected_milestone_id) if selected_milestone_id is not None else None
    return format_workflow_overview_markdown(tree, selected_milestone_id=selected)


@tool
async def get_milestone(
    fields: list[str] | None = None,
    milestone_id: str | None = None,
    config: Annotated[RunnableConfig, InjectedToolArg()] = None,  # type: ignore[assignment]
) -> str:
    """Load selected projections of a workflow milestone.

    ``fields`` is a list of: goal, input, data, help, criteria, eval, meta.
    Omit fields (or pass empty) for the default set: goal, input, data.
    Omit milestone_id for the UI-selected milestone; pass an id from the injected workflow
    catalog (or get_workflow_overview) to read any milestone in the current workflow."""
    normalized, fields_err = _normalize_milestone_fields(fields)
    if fields_err is not None or normalized is None:
        return fields_err or "Error: invalid fields."

    query, cache_key = _query_for_milestone_fields(normalized)
    target_id, node, err = await _load_milestone_for_chat(
        config,
        milestone_id=milestone_id,
        query=query,
        cache_key=cache_key,
    )
    if err is not None or node is None or target_id is None:
        return err or "Error: milestone not found."

    explicit = milestone_id is not None and str(milestone_id).strip() != ""
    return _format_milestone_fields(
        target_id,
        node,
        normalized,
        explicit_milestone_id=explicit,
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
async def get_location_data(config: Annotated[RunnableConfig, InjectedToolArg()]) -> str:
    """Load location-page data for the campaign venue: basics, opening hours, owner quick profile.

    Call when the user asks about venue hours, address, cuisine, contact links, or other
    location settings configured on the location page."""
    c = (config or {}).get("configurable") or {}
    location_id = c.get("location_id")
    user_id = c.get("user_id")
    if location_id is None or not user_id:
        return (
            "Location context is not available (missing location). "
            "Open workflow chat for a campaign with a linked location."
        )
    client = get_chat_http_client()
    loc_data = await graphql_post(
        client,
        LOCATION_QUERY,
        {"id": str(location_id)},
        str(user_id),
    )
    raw_loc = loc_data.get("location")
    if not isinstance(raw_loc, dict):
        return "Location not found or access denied."
    return format_location_page_markdown(raw_loc)


@tool
async def get_chart_data(
    chart_id: Literal[
        "venue_slot_strength_heatmap",
        "menu_item_heatmap",
        "pair_lift_matrix_heatmap",
    ],
    config: Annotated[RunnableConfig, InjectedToolArg()] = None,  # type: ignore[assignment]
) -> str:
    """Load analytics data for a workflow visualization chart (main Instagram planning sources).

    - ``venue_slot_strength_heatmap``: posting frequency and best timing (``schedule``).
    - ``menu_item_heatmap``: which menus to feature, with timing context.
    - ``pair_lift_matrix_heatmap``: interesting menu combos / co-purchase pairings.

    Pass a chart_id from the workflow chart catalog exactly — do not invent ids.
    """
    c = (config or {}).get("configurable") or {}
    location_id = c.get("location_id")
    user_id = c.get("user_id")
    analytics_run_id = c.get("analytics_run_id")
    if location_id is None or not user_id:
        return (
            "Location context is not available (missing location). "
            "Open workflow chat for a campaign with a linked location."
        )
    if not is_chart_id(chart_id):
        allowed = ", ".join(CHART_IDS)
        return f"Unknown chart_id {chart_id!r}. Allowed values: {allowed}."

    client = get_chat_http_client()
    return await load_chart_data_markdown(
        client,
        chart_id=chart_id,
        location_id=int(location_id),
        user_id=str(user_id),
        analytics_run_id=analytics_run_id,
    )


def _workflow_chat_context(config: RunnableConfig | None) -> tuple[str, str] | str:
    """Return ``(workflow_id, user_id)`` or an error message string."""
    c = (config or {}).get("configurable") or {}
    workflow_id = c.get("workflow_id")
    user_id = c.get("user_id")
    if not isinstance(workflow_id, str) or not workflow_id.strip():
        return (
            "Workflow context is not available (missing workflow_id). "
            "Open campaign workflow chat to manage Instagram items."
        )
    if not isinstance(user_id, str) or not user_id.strip():
        return "User context is not available."
    return workflow_id.strip(), user_id.strip()


def _format_ig_item_line(item: dict[str, Any]) -> str:
    item_id = item.get("id", "?")
    kind = item.get("kind") or "?"
    title = item.get("title") or "(untitled)"
    status = item.get("status") or "?"
    schedule = item.get("schedule")
    schedule_bit = f", schedule={schedule}" if schedule else ""
    return f"- id={item_id} kind={kind} status={status} title={title!r}{schedule_bit}"


def _format_ig_item_detail(item: dict[str, Any]) -> str:
    """Readable markdown for one Instagram item (edit-ready; no media version dumps)."""
    lines = [
        f"# Instagram item id={item.get('id', '?')}",
        f"- **kind**: {item.get('kind') or '?'}",
        f"- **status**: {item.get('status') or '?'}",
        f"- **title**: {item.get('title') or '(untitled)'}",
    ]
    schedule = item.get("schedule")
    if schedule:
        lines.append(f"- **schedule**: {schedule}")
    caption = item.get("caption")
    if isinstance(caption, str) and caption.strip():
        lines.extend(["", "## Caption", caption.strip()])
    hook = item.get("hook")
    if isinstance(hook, str) and hook.strip():
        lines.extend(["", "## Hook", hook.strip()])
    visual_brief = item.get("visualBrief")
    if isinstance(visual_brief, str) and visual_brief.strip():
        lines.extend(["", "## Visual brief", visual_brief.strip()])
    pages = item.get("pages")
    if isinstance(pages, list) and pages:
        lines.extend(["", "## Pages"])
        for page in pages:
            if not isinstance(page, dict):
                continue
            page_id = page.get("id", "?")
            sort_order = page.get("sortOrder")
            order_bit = f" sortOrder={sort_order}" if sort_order is not None else ""
            has_media = bool(page.get("mediaS3Key"))
            lines.append(f"- id={page_id}{order_bit} has_media={has_media}")
    return "\n".join(lines)


def _normalize_ig_kind(raw: Any) -> str | None:
    if not isinstance(raw, str):
        return None
    cleaned = raw.strip().lower()
    return cleaned if cleaned in _VALID_IG_KINDS else None


def _normalize_ig_status(raw: Any) -> str | None:
    if not isinstance(raw, str):
        return None
    cleaned = raw.strip().lower()
    return cleaned if cleaned in _VALID_IG_STATUSES else None


def _optional_text(raw: Any) -> str | None:
    if raw is None:
        return None
    if not isinstance(raw, str):
        msg = "must be a string"
        raise ValueError(msg)
    return raw


def _optional_schedule(raw: Any) -> str | None:
    if raw is None:
        return None
    if not isinstance(raw, str) or not raw.strip():
        msg = "schedule must be an ISO-8601 datetime string or null"
        raise ValueError(msg)
    return raw.strip()


@tool
async def list_instagram_items(
    config: Annotated[RunnableConfig, InjectedToolArg()] = None,  # type: ignore[assignment]
) -> str:
    """List Instagram draft items (story/post/reel) for the current campaign workflow.

    Call before update or delete so you use real item ids. Also use to confirm what
    already exists before creating more drafts. For full caption/hook/visual brief, call
    ``get_instagram_item`` on a specific id.
    """
    ctx = _workflow_chat_context(config)
    if isinstance(ctx, str):
        return ctx
    workflow_id, user_id = ctx
    client = get_chat_http_client()
    items = await fetch_instagram_items(workflow_id, user_id, client=client)
    if not items:
        return f"No Instagram items for workflow id={workflow_id}."
    lines = [f"Instagram items for workflow id={workflow_id} ({len(items)}):"]
    lines.extend(_format_ig_item_line(item) for item in items)
    return "\n".join(lines)


@tool
async def get_instagram_item(
    item_id: str,
    config: Annotated[RunnableConfig, InjectedToolArg()] = None,  # type: ignore[assignment]
) -> str:
    """Load full fields for one Instagram item (caption, hook, visual brief, schedule, pages).

    Call before updating an existing draft when you need current copy or page ids.
    Prefer ``list_instagram_items`` first when the id is unknown.
    """
    ctx = _workflow_chat_context(config)
    if isinstance(ctx, str):
        return ctx
    _workflow_id, user_id = ctx
    cleaned = item_id.strip() if isinstance(item_id, str) else ""
    if not cleaned:
        return "Missing required field 'item_id'."
    client = get_chat_http_client()
    item = await fetch_instagram_item(cleaned, user_id, client=client)
    if item is None:
        return f"Instagram item id={cleaned} not found or access denied."
    return _format_ig_item_detail(item)


@tool
async def create_instagram_items(
    items: list[dict[str, Any]] | None = None,
    config: Annotated[RunnableConfig, InjectedToolArg()] = None,  # type: ignore[assignment]
) -> str:
    """Create one or more Instagram draft items for the current workflow (batch).

    Prefer this tool (not chat-only advice) when the user asks to create Stories, posts,
    or Reels. Each item object requires ``kind`` (``story`` | ``post`` | ``reel``).
    Optional fields: ``title``, ``caption``, ``hook``, ``visual_brief``,
    ``status`` (``draft`` | ``ready``), ``schedule`` (ISO-8601 datetime). Prefer a single
    call with multiple items when the user asks for several drafts at once. Ground timing
    and menus in ``get_chart_data`` when available.
    """
    ctx = _workflow_chat_context(config)
    if isinstance(ctx, str):
        return ctx
    workflow_id, user_id = ctx
    if not isinstance(items, list) or len(items) == 0:
        return (
            "Missing required field 'items'. Provide a non-empty list, for example: "
            "[{'kind':'post','title':'Friday special','caption':'...'}]."
        )

    client = get_chat_http_client()
    successes: list[str] = []
    errors: list[str] = []

    for i, row in enumerate(items, start=1):
        if not isinstance(row, dict):
            errors.append(f"#{i}: item must be an object.")
            continue
        kind = _normalize_ig_kind(row.get("kind"))
        if kind is None:
            errors.append(
                f"#{i}: kind must be one of: {', '.join(sorted(_VALID_IG_KINDS))}."
            )
            continue
        unknown = set(row.keys()) - ({"kind"} | _IG_CREATE_OPTIONAL_KEYS)
        if unknown:
            errors.append(f"#{i}: unsupported fields: {', '.join(sorted(unknown))}.")
            continue
        try:
            status_raw = row.get("status")
            status = None
            if status_raw is not None:
                status = _normalize_ig_status(status_raw)
                if status is None:
                    raise ValueError(
                        f"status must be one of: {', '.join(sorted(_VALID_IG_STATUSES))}"
                    )
            created = await persist_create_instagram_item(
                workflow_id,
                user_id,
                kind=kind,
                title=_optional_text(row.get("title")),
                caption=_optional_text(row.get("caption")),
                hook=_optional_text(row.get("hook")),
                visual_brief=_optional_text(row.get("visual_brief")),
                status=status,
                schedule=_optional_schedule(row.get("schedule"))
                if "schedule" in row
                else None,
                client=client,
            )
            successes.append(_format_ig_item_line(created))
        except Exception as exc:  # noqa: BLE001 — report per-item failures in batch
            errors.append(f"#{i}: {exc}")

    parts: list[str] = []
    if successes:
        parts.append(f"Created {len(successes)} Instagram item(s):")
        parts.extend(successes)
    if errors:
        parts.append(f"Failed {len(errors)} item(s):")
        parts.extend(f"- {err}" for err in errors)
    if not parts:
        return "No Instagram items were created."
    return "\n".join(parts)


@tool
async def update_instagram_items(
    items: list[dict[str, Any]] | None = None,
    config: Annotated[RunnableConfig, InjectedToolArg()] = None,  # type: ignore[assignment]
) -> str:
    """Update one or more existing Instagram items (batch).

    Prefer this tool when the user asks to edit drafts. Each item requires ``id`` and at
    least one of: ``kind``, ``title``, ``caption``, ``hook``, ``visual_brief``, ``status``,
    ``schedule`` (ISO-8601 or null to clear). Call ``list_instagram_items`` when ids are
    unknown; call ``get_instagram_item`` when you need current full fields before patching.
    """
    ctx = _workflow_chat_context(config)
    if isinstance(ctx, str):
        return ctx
    _workflow_id, user_id = ctx
    if not isinstance(items, list) or len(items) == 0:
        return (
            "Missing required field 'items'. Provide a non-empty list, for example: "
            "[{'id':'12','caption':'Updated copy'}]."
        )

    client = get_chat_http_client()
    successes: list[str] = []
    errors: list[str] = []

    for i, row in enumerate(items, start=1):
        if not isinstance(row, dict):
            errors.append(f"#{i}: item must be an object.")
            continue
        raw_id = row.get("id")
        if raw_id is None or (isinstance(raw_id, str) and not raw_id.strip()):
            errors.append(f"#{i}: id is required.")
            continue
        item_id = str(raw_id).strip()
        unknown = set(row.keys()) - ({"id"} | _IG_UPDATE_OPTIONAL_KEYS)
        if unknown:
            errors.append(f"#{i}: unsupported fields: {', '.join(sorted(unknown))}.")
            continue

        patch_keys = [k for k in _IG_UPDATE_OPTIONAL_KEYS if k in row]
        if not patch_keys:
            errors.append(f"#{i}: at least one field to update is required.")
            continue

        try:
            kwargs: dict[str, Any] = {"client": client}
            if "kind" in row:
                kind = _normalize_ig_kind(row.get("kind"))
                if kind is None:
                    raise ValueError(
                        f"kind must be one of: {', '.join(sorted(_VALID_IG_KINDS))}"
                    )
                kwargs["kind"] = kind
            if "title" in row:
                kwargs["title"] = _optional_text(row.get("title"))
            if "caption" in row:
                kwargs["caption"] = _optional_text(row.get("caption"))
            if "hook" in row:
                kwargs["hook"] = _optional_text(row.get("hook"))
            if "visual_brief" in row:
                kwargs["visual_brief"] = _optional_text(row.get("visual_brief"))
            if "status" in row:
                status = _normalize_ig_status(row.get("status"))
                if status is None:
                    raise ValueError(
                        f"status must be one of: {', '.join(sorted(_VALID_IG_STATUSES))}"
                    )
                kwargs["status"] = status
            if "schedule" in row:
                sched = row.get("schedule")
                if sched is None:
                    kwargs["schedule"] = None
                else:
                    kwargs["schedule"] = _optional_schedule(sched)

            updated = await persist_update_instagram_item(item_id, user_id, **kwargs)
            successes.append(_format_ig_item_line(updated))
        except Exception as exc:  # noqa: BLE001 — report per-item failures in batch
            errors.append(f"#{i} id={item_id}: {exc}")

    parts: list[str] = []
    if successes:
        parts.append(f"Updated {len(successes)} Instagram item(s):")
        parts.extend(successes)
    if errors:
        parts.append(f"Failed {len(errors)} item(s):")
        parts.extend(f"- {err}" for err in errors)
    if not parts:
        return "No Instagram items were updated."
    return "\n".join(parts)


@tool
async def delete_instagram_items(
    ids: list[str] | None = None,
    config: Annotated[RunnableConfig, InjectedToolArg()] = None,  # type: ignore[assignment]
) -> str:
    """Delete one or more Instagram items by id (batch).

    Prefer this tool when the user asks to remove drafts. Call ``list_instagram_items``
    first when ids are unknown. Confirm with the user when delete intent is ambiguous.
    """
    ctx = _workflow_chat_context(config)
    if isinstance(ctx, str):
        return ctx
    _workflow_id, user_id = ctx
    if not isinstance(ids, list) or len(ids) == 0:
        return (
            "Missing required field 'ids'. Provide a non-empty list of Instagram item ids, "
            "for example: ['12','15']."
        )

    client = get_chat_http_client()
    successes: list[str] = []
    errors: list[str] = []

    for i, raw_id in enumerate(ids, start=1):
        if raw_id is None or (isinstance(raw_id, str) and not str(raw_id).strip()):
            errors.append(f"#{i}: id is required.")
            continue
        item_id = str(raw_id).strip()
        try:
            ok = await persist_delete_instagram_item(item_id, user_id, client=client)
            if ok:
                successes.append(f"- deleted id={item_id}")
            else:
                errors.append(f"#{i} id={item_id}: delete returned false.")
        except Exception as exc:  # noqa: BLE001 — report per-item failures in batch
            errors.append(f"#{i} id={item_id}: {exc}")

    parts: list[str] = []
    if successes:
        parts.append(f"Deleted {len(successes)} Instagram item(s):")
        parts.extend(successes)
    if errors:
        parts.append(f"Failed {len(errors)} item(s):")
        parts.extend(f"- {err}" for err in errors)
    if not parts:
        return "No Instagram items were deleted."
    return "\n".join(parts)
