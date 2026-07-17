"""Helpers for location style pack writes (default exclusivity, validation)."""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from graphql.data_sources.models.location_style import LocationStyle

_MAX_NAME_LEN = 128
_MAX_RULES_LEN = 4000
_MAX_IMAGE_NAME_LEN = 512

_CONTROL_KEYS = ("headline", "productName", "backgroundIllustration")


def validate_style_fields(
    *,
    name: str,
    rules: str,
    reference_image_name: str,
) -> tuple[str, str, str]:
    name_clean = name.strip()
    rules_clean = rules.strip()
    image_clean = reference_image_name.strip()
    if not name_clean:
        raise ValueError("Name is required")
    if len(name_clean) > _MAX_NAME_LEN:
        raise ValueError(f"Name must be at most {_MAX_NAME_LEN} characters")
    if not rules_clean:
        raise ValueError("Rules are required")
    if len(rules_clean) > _MAX_RULES_LEN:
        raise ValueError(f"Rules must be at most {_MAX_RULES_LEN} characters")
    if not image_clean:
        raise ValueError("Reference image name is required")
    if len(image_clean) > _MAX_IMAGE_NAME_LEN:
        raise ValueError(f"Reference image name must be at most {_MAX_IMAGE_NAME_LEN} characters")
    return name_clean, rules_clean, image_clean


def _require_control(raw: Any, key: str) -> dict[str, Any]:
    if not isinstance(raw, dict):
        raise ValueError(f"styleSpec.controls.{key} must be an object")
    values = raw.get("values")
    if (
        not isinstance(values, list)
        or not values
        or not all(isinstance(v, str) and v.strip() for v in values)
    ):
        raise ValueError(f"styleSpec.controls.{key}.values must be a non-empty string list")
    default = raw.get("default")
    if not isinstance(default, str) or default not in values:
        raise ValueError(f"styleSpec.controls.{key}.default must be one of values")
    instructions = raw.get("instructions")
    if not isinstance(instructions, dict):
        raise ValueError(f"styleSpec.controls.{key}.instructions must be an object")
    for value in values:
        text = instructions.get(value)
        if not isinstance(text, str) or not text.strip():
            raise ValueError(f"styleSpec.controls.{key}.instructions missing for {value!r}")
    control_type = raw.get("type", "enum")
    if control_type != "enum":
        raise ValueError(f"styleSpec.controls.{key}.type must be 'enum'")
    return {
        "type": "enum",
        "values": [str(v).strip() for v in values],
        "default": str(default).strip(),
        "instructions": {
            str(k): str(v).strip() for k, v in instructions.items() if isinstance(v, str)
        },
        **({"description": raw["description"]} if isinstance(raw.get("description"), str) else {}),
        **({"params": raw["params"]} if isinstance(raw.get("params"), dict) else {}),
    }


def validate_style_spec(raw: Any) -> dict[str, Any]:
    """Validate Style Spec v1; return a normalized dict for persistence."""
    if raw is None:
        raise ValueError("styleSpec is required when provided")
    if not isinstance(raw, dict):
        raise ValueError("styleSpec must be a JSON object")
    if raw.get("schemaVersion") != 1:
        raise ValueError("styleSpec.schemaVersion must be 1")
    kind = raw.get("kind")
    if kind not in ("template", "mood"):
        raise ValueError("styleSpec.kind must be 'template' or 'mood'")
    base_rules = raw.get("baseRules")
    if not isinstance(base_rules, list) or not base_rules:
        raise ValueError("styleSpec.baseRules must be a non-empty list")
    cleaned_rules = [str(r).strip() for r in base_rules if str(r).strip()]
    if not cleaned_rules:
        raise ValueError("styleSpec.baseRules must be a non-empty list")
    if len(cleaned_rules) > 40:
        raise ValueError("styleSpec.baseRules must have at most 40 items")

    controls_raw = raw.get("controls")
    if not isinstance(controls_raw, dict):
        raise ValueError("styleSpec.controls must be an object")
    controls: dict[str, Any] = {}
    for key in _CONTROL_KEYS:
        if key not in controls_raw:
            raise ValueError(f"styleSpec.controls.{key} is required")
        controls[key] = _require_control(controls_raw[key], key)

    defaults_raw = raw.get("defaults")
    if not isinstance(defaults_raw, dict):
        raise ValueError("styleSpec.defaults must be an object")
    defaults: dict[str, str] = {}
    for key in _CONTROL_KEYS:
        value = defaults_raw.get(key)
        if not isinstance(value, str) or value not in controls[key]["values"]:
            raise ValueError(f"styleSpec.defaults.{key} must be one of controls.{key}.values")
        defaults[key] = value

    return {
        "schemaVersion": 1,
        "kind": kind,
        "baseRules": cleaned_rules,
        "controls": controls,
        "defaults": defaults,
    }


def rules_from_style_spec(spec: dict[str, Any]) -> str:
    rules = "\n".join(str(r).strip() for r in spec.get("baseRules", []) if str(r).strip())
    if not rules:
        raise ValueError("styleSpec.baseRules produced empty rules")
    return rules[:_MAX_RULES_LEN]


def clear_other_defaults(session: Session, location_id: int, keep_id: int | None = None) -> None:
    """Ensure at most one is_default=True per location."""
    q = session.query(LocationStyle).filter(
        LocationStyle.location_id == location_id,
        LocationStyle.is_default.is_(True),
    )
    if keep_id is not None:
        q = q.filter(LocationStyle.id != keep_id)
    for row in q.all():
        row.is_default = False
