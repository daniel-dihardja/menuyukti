"""Validate workflow_export_schema.json against representative payloads."""

from __future__ import annotations

import json
from pathlib import Path

import jsonschema
import pytest

_SCHEMA_PATH = Path(__file__).resolve().parents[1] / "workflow_export_schema.json"


@pytest.fixture(scope="module")
def schema() -> dict[str, object]:
    with _SCHEMA_PATH.open(encoding="utf-8") as f:
        return json.load(f)


def _validate(instance: object, schema: dict[str, object]) -> None:
    jsonschema.validate(instance=instance, schema=schema)


def test_schema_file_is_valid_json_schema(schema: dict[str, object]) -> None:
    assert schema.get("$schema") == "https://json-schema.org/draft/2020-12/schema"
    assert "oneOf" in schema


def test_minimal_import_payload_example_validates(schema: dict[str, object]) -> None:
    examples = schema.get("examples")
    assert isinstance(examples, list) and len(examples) >= 1
    _validate(examples[0], schema)


def test_full_export_snapshot_example_validates(schema: dict[str, object]) -> None:
    examples = schema.get("examples")
    assert isinstance(examples, list) and len(examples) >= 2
    _validate(examples[1], schema)


def test_import_payload_without_goal_validates(schema: dict[str, object]) -> None:
    payload = {
        "workflowName": "No goal workflow",
        "milestones": [{"order": 0, "title": "Only milestone", "passCriteria": []}],
    }
    _validate(payload, schema)


def test_export_rejects_unknown_top_level_key(schema: dict[str, object]) -> None:
    bad = {
        "workflowName": "x",
        "milestones": [],
        "extra": 1,
    }
    with pytest.raises(jsonschema.ValidationError):
        _validate(bad, schema)


def test_milestone_requires_order_for_schema_validity(schema: dict[str, object]) -> None:
    bad_import = {
        "workflowName": "Test",
        "milestones": [{"title": "Missing order"}],
    }
    with pytest.raises(jsonschema.ValidationError):
        _validate(bad_import, schema)
