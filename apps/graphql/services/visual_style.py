"""Helpers for visual style pack writes (default exclusivity, validation)."""

from __future__ import annotations

import re
from typing import Any

from sqlalchemy.orm import Session

from graphql.data_sources.models.visual_style import VisualStyle

_MAX_NAME_LEN = 128
_MAX_RULES_LEN = 4000
_MAX_IMAGE_NAME_LEN = 512
_MAX_PROPERTIES = 30

_PROPERTY_KEY_RE = re.compile(r"^[a-zA-Z][a-zA-Z0-9_]*$")


def validate_style_name(name: str) -> str:
    name_clean = name.strip()
    if not name_clean:
        raise ValueError("Name is required")
    if len(name_clean) > _MAX_NAME_LEN:
        raise ValueError(f"Name must be at most {_MAX_NAME_LEN} characters")
    return name_clean


def validate_reference_image_name(reference_image_name: str) -> str:
    image_clean = reference_image_name.strip()
    if not image_clean:
        raise ValueError("Reference image name is required")
    if len(image_clean) > _MAX_IMAGE_NAME_LEN:
        raise ValueError(f"Reference image name must be at most {_MAX_IMAGE_NAME_LEN} characters")
    return image_clean


def validate_style_fields(
    *,
    name: str,
    rules: str,
    reference_image_name: str,
) -> tuple[str, str, str]:
    name_clean = validate_style_name(name)
    rules_clean = rules.strip()
    image_clean = validate_reference_image_name(reference_image_name)
    if not rules_clean:
        raise ValueError("Rules are required")
    if len(rules_clean) > _MAX_RULES_LEN:
        raise ValueError(f"Rules must be at most {_MAX_RULES_LEN} characters")
    return name_clean, rules_clean, image_clean


def _require_enum_property(raw: Any, key: str) -> dict[str, Any]:
    if not isinstance(raw, dict):
        raise ValueError(f"styleSpec.properties.{key} must be an object")
    if raw.get("type") != "enum":
        raise ValueError(f"styleSpec.properties.{key}.type must be 'enum'")
    values = raw.get("values")
    if (
        not isinstance(values, list)
        or not values
        or not all(isinstance(v, str) and v.strip() for v in values)
    ):
        raise ValueError(f"styleSpec.properties.{key}.values must be a non-empty string list")
    default = raw.get("default")
    if not isinstance(default, str) or default not in values:
        raise ValueError(f"styleSpec.properties.{key}.default must be one of values")
    instructions = raw.get("instructions")
    if not isinstance(instructions, dict):
        raise ValueError(f"styleSpec.properties.{key}.instructions must be an object")
    for value in values:
        text = instructions.get(value)
        if not isinstance(text, str) or not text.strip():
            raise ValueError(f"styleSpec.properties.{key}.instructions missing for {value!r}")
    out: dict[str, Any] = {
        "type": "enum",
        "values": [str(v).strip() for v in values],
        "default": str(default).strip(),
        "instructions": {
            str(k): str(v).strip() for k, v in instructions.items() if isinstance(v, str)
        },
    }
    if isinstance(raw.get("label"), str) and raw["label"].strip():
        out["label"] = raw["label"].strip()
    if isinstance(raw.get("description"), str) and raw["description"].strip():
        out["description"] = raw["description"].strip()
    if isinstance(raw.get("params"), dict):
        out["params"] = raw["params"]
    return out


def _require_boolean_property(raw: Any, key: str) -> dict[str, Any]:
    if not isinstance(raw, dict):
        raise ValueError(f"styleSpec.properties.{key} must be an object")
    if raw.get("type") != "boolean":
        raise ValueError(f"styleSpec.properties.{key}.type must be 'boolean'")
    if not isinstance(raw.get("default"), bool):
        raise ValueError(f"styleSpec.properties.{key}.default must be a boolean")
    instructions = raw.get("instructions")
    if not isinstance(instructions, dict):
        raise ValueError(f"styleSpec.properties.{key}.instructions must be an object")
    for branch in ("true", "false"):
        text = instructions.get(branch)
        if not isinstance(text, str) or not text.strip():
            raise ValueError(f"styleSpec.properties.{key}.instructions.{branch} is required")
    out: dict[str, Any] = {
        "type": "boolean",
        "default": raw["default"],
        "instructions": {
            "true": str(instructions["true"]).strip(),
            "false": str(instructions["false"]).strip(),
        },
    }
    if isinstance(raw.get("label"), str) and raw["label"].strip():
        out["label"] = raw["label"].strip()
    if isinstance(raw.get("description"), str) and raw["description"].strip():
        out["description"] = raw["description"].strip()
    return out


def _require_number_property(raw: Any, key: str) -> dict[str, Any]:
    if not isinstance(raw, dict):
        raise ValueError(f"styleSpec.properties.{key} must be an object")
    if raw.get("type") != "number":
        raise ValueError(f"styleSpec.properties.{key}.type must be 'number'")
    default = raw.get("default")
    if not isinstance(default, (int, float)) or isinstance(default, bool):
        raise ValueError(f"styleSpec.properties.{key}.default must be a number")
    instruction = raw.get("instruction")
    if not isinstance(instruction, str) or not instruction.strip():
        raise ValueError(f"styleSpec.properties.{key}.instruction is required")
    min_val = raw.get("min")
    max_val = raw.get("max")
    if min_val is not None and not isinstance(min_val, (int, float)):
        raise ValueError(f"styleSpec.properties.{key}.min must be a number")
    if max_val is not None and not isinstance(max_val, (int, float)):
        raise ValueError(f"styleSpec.properties.{key}.max must be a number")
    if min_val is not None and max_val is not None and min_val > max_val:
        raise ValueError(f"styleSpec.properties.{key}.min must be <= max")
    if min_val is not None and default < min_val:
        raise ValueError(f"styleSpec.properties.{key}.default must be >= min")
    if max_val is not None and default > max_val:
        raise ValueError(f"styleSpec.properties.{key}.default must be <= max")
    out: dict[str, Any] = {
        "type": "number",
        "default": default,
        "instruction": instruction.strip(),
    }
    if min_val is not None:
        out["min"] = min_val
    if max_val is not None:
        out["max"] = max_val
    if isinstance(raw.get("label"), str) and raw["label"].strip():
        out["label"] = raw["label"].strip()
    if isinstance(raw.get("description"), str) and raw["description"].strip():
        out["description"] = raw["description"].strip()
    return out


def _require_text_property(raw: Any, key: str) -> dict[str, Any]:
    if not isinstance(raw, dict):
        raise ValueError(f"styleSpec.properties.{key} must be an object")
    if raw.get("type") != "text":
        raise ValueError(f"styleSpec.properties.{key}.type must be 'text'")
    if not isinstance(raw.get("default"), str):
        raise ValueError(f"styleSpec.properties.{key}.default must be a string")
    instruction = raw.get("instruction")
    if not isinstance(instruction, str) or not instruction.strip():
        raise ValueError(f"styleSpec.properties.{key}.instruction is required")
    out: dict[str, Any] = {
        "type": "text",
        "default": raw["default"],
        "instruction": instruction.strip(),
    }
    if isinstance(raw.get("label"), str) and raw["label"].strip():
        out["label"] = raw["label"].strip()
    if isinstance(raw.get("description"), str) and raw["description"].strip():
        out["description"] = raw["description"].strip()
    return out


def _require_property(raw: Any, key: str) -> dict[str, Any]:
    if not isinstance(raw, dict):
        raise ValueError(f"styleSpec.properties.{key} must be an object")
    prop_type = raw.get("type")
    if prop_type == "enum":
        return _require_enum_property(raw, key)
    if prop_type == "boolean":
        return _require_boolean_property(raw, key)
    if prop_type == "number":
        return _require_number_property(raw, key)
    if prop_type == "text":
        return _require_text_property(raw, key)
    raise ValueError(
        f"styleSpec.properties.{key}.type must be one of: enum, boolean, number, text"
    )


def validate_style_spec(raw: Any) -> dict[str, Any]:
    """Validate Style Spec v2; return a normalized dict for persistence."""
    if raw is None:
        raise ValueError("styleSpec is required when provided")
    if not isinstance(raw, dict):
        raise ValueError("styleSpec must be a JSON object")
    if raw.get("schemaVersion") != 2:
        raise ValueError("styleSpec.schemaVersion must be 2")

    properties_raw = raw.get("properties")
    if not isinstance(properties_raw, dict) or not properties_raw:
        raise ValueError("styleSpec.properties must be a non-empty object")
    if len(properties_raw) > _MAX_PROPERTIES:
        raise ValueError(f"styleSpec.properties must have at most {_MAX_PROPERTIES} entries")

    properties: dict[str, Any] = {}
    for key, prop_raw in properties_raw.items():
        if not isinstance(key, str) or not _PROPERTY_KEY_RE.match(key):
            raise ValueError(f"styleSpec.properties has invalid key {key!r}")
        properties[key] = _require_property(prop_raw, key)

    return {
        "schemaVersion": 2,
        "properties": properties,
    }


def rules_from_style_spec(spec: dict[str, Any]) -> str:
    """Sync rules column from compiled property defaults."""
    properties = spec.get("properties") or {}
    if not isinstance(properties, dict) or not properties:
        raise ValueError("styleSpec.properties produced empty rules")

    lines: list[str] = ["PROPERTIES (resolved):"]
    for key, prop in properties.items():
        if not isinstance(prop, dict):
            continue
        prop_type = prop.get("type")
        if prop_type == "enum":
            default = str(prop.get("default", "")).strip()
            instructions = prop.get("instructions") or {}
            instruction = str(instructions.get(default, "")).strip()
            if instruction:
                lines.append(f"- {key}: {default} → {instruction}")
        elif prop_type == "boolean":
            default = bool(prop.get("default"))
            flag = "true" if default else "false"
            instructions = prop.get("instructions") or {}
            instruction = str(instructions.get(flag, "")).strip()
            if instruction:
                lines.append(f"- {key}: {default} → {instruction}")
        elif prop_type == "number":
            default = prop.get("default")
            instruction = str(prop.get("instruction", "")).strip().replace(
                "{{value}}", str(default)
            )
            if instruction:
                lines.append(f"- {key}: {default} → {instruction}")
        elif prop_type == "text":
            default = str(prop.get("default", ""))
            instruction = str(prop.get("instruction", "")).strip().replace(
                "{{value}}", default
            )
            if instruction:
                lines.append(f"- {key}: {default} → {instruction}")

    if len(lines) < 2:
        raise ValueError("styleSpec.properties produced empty rules")
    return "\n".join(lines)[:_MAX_RULES_LEN]


def clear_other_defaults(session: Session, workspace_id: int, keep_id: int | None = None) -> None:
    """Ensure at most one is_default=True per workspace."""
    q = session.query(VisualStyle).filter(
        VisualStyle.workspace_id == workspace_id,
        VisualStyle.is_default.is_(True),
    )
    if keep_id is not None:
        q = q.filter(VisualStyle.id != keep_id)
    for row in q.all():
        row.is_default = False
