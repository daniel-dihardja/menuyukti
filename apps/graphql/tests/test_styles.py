"""Tests for styles queries and CRUD mutations."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime

import pytest
from graphql.data_sources import (
    SessionLocal,
    VisualStyle,
    Workspace,
    WorkspaceMembership,
)
from graphql.schema import schema
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context

_SAMPLE_SPEC = {
    "schemaVersion": 2,
    "properties": {
        "headline": {
            "type": "enum",
            "values": ["auto", "none"],
            "default": "auto",
            "instructions": {
                "auto": "Place a short headline top-left when provided.",
                "none": "Leave the headline area empty.",
            },
        },
        "productName": {
            "type": "enum",
            "values": ["auto", "none"],
            "default": "auto",
            "instructions": {
                "auto": "Place product name under the cup when provided.",
                "none": "Omit product name.",
            },
        },
        "backgroundIllustration": {
            "type": "enum",
            "values": ["template_default", "none"],
            "default": "template_default",
            "instructions": {
                "template_default": "Keep template line-art decorations.",
                "none": "No background illustrations.",
            },
        },
    },
}

_LIST_QUERY = """
query Styles {
  styles {
    id
    workspaceId
    createdByClerkUserId
    name
    rules
    referenceImageName
    isDefault
    spec
  }
}
"""

_ONE_QUERY = """
query Style($id: Int!) {
  style(id: $id) {
    id
    workspaceId
    createdByClerkUserId
    name
    rules
    referenceImageName
    isDefault
    spec
  }
}
"""

_CREATE = """
mutation CreateStyle(
  $name: String!
  $referenceImageName: String!
  $spec: JSON!
  $isDefault: Boolean
) {
  createStyle(
    name: $name
    referenceImageName: $referenceImageName
    spec: $spec
    isDefault: $isDefault
  ) {
    id
    workspaceId
    createdByClerkUserId
    name
    rules
    referenceImageName
    isDefault
    spec
  }
}
"""

_UPDATE = """
mutation UpdateStyle(
  $id: Int!
  $name: String
  $referenceImageName: String
  $spec: JSON
  $isDefault: Boolean
) {
  updateStyle(
    id: $id
    name: $name
    referenceImageName: $referenceImageName
    spec: $spec
    isDefault: $isDefault
  ) {
    id
    name
    rules
    referenceImageName
    isDefault
    spec
  }
}
"""

_DELETE = """
mutation DeleteStyle($id: Int!) {
  deleteStyle(id: $id)
}
"""

OTHER_USER_ID = "clerk_other_style_user"


@pytest.fixture
def style_workspace_id():
    session = SessionLocal()
    try:
        session.query(VisualStyle).delete()
        session.query(WorkspaceMembership).delete()
        session.query(Workspace).delete()
        session.commit()

        now = datetime.now(tz=UTC)
        ws = Workspace(name="Style Pack workspace", owner_clerk_user_id=GRAPHQL_TEST_USER_ID)
        session.add(ws)
        session.flush()
        session.add(
            WorkspaceMembership(
                workspace_id=ws.id,
                clerk_user_id=GRAPHQL_TEST_USER_ID,
                role="owner",
                invited_at=now,
                accepted_at=now,
            )
        )
        session.commit()
        session.refresh(ws)
        wid = ws.id
    finally:
        session.close()
    yield wid
    session = SessionLocal()
    try:
        session.query(VisualStyle).filter(VisualStyle.workspace_id == wid).delete()
        session.query(WorkspaceMembership).filter(WorkspaceMembership.workspace_id == wid).delete()
        session.query(Workspace).filter(Workspace.id == wid).delete()
        session.commit()
    finally:
        session.close()


def _execute(query: str, variable_values: dict | None = None, context_value: dict | None = None):
    return asyncio.run(
        schema.execute(
            query,
            variable_values=variable_values or {},
            context_value=context_value if context_value is not None else graphql_auth_context(),
        )
    )


def test_list_empty_for_member(style_workspace_id: int):
    result = _execute(_LIST_QUERY)
    assert result.errors is None
    assert result.data["styles"] == []


def test_list_denied_without_auth(style_workspace_id: int):
    result = _execute(_LIST_QUERY, context_value={})
    assert result.errors is None
    assert result.data["styles"] == []


def test_create_update_delete_and_default_exclusivity(style_workspace_id: int):
    created_a = _execute(
        _CREATE,
        {
            "name": "Warm editorial",
            "referenceImageName": "warm-ref.webp",
            "spec": _SAMPLE_SPEC,
            "isDefault": True,
        },
    )
    assert created_a.errors is None
    style_a = created_a.data["createStyle"]
    assert style_a["isDefault"] is True
    assert style_a["workspaceId"] == style_workspace_id
    assert style_a["createdByClerkUserId"] == GRAPHQL_TEST_USER_ID
    assert style_a["referenceImageName"] == "warm-ref.webp"
    assert style_a["spec"]["schemaVersion"] == 2
    assert "PROPERTIES (resolved):" in style_a["rules"]
    id_a = style_a["id"]

    created_b = _execute(
        _CREATE,
        {
            "name": "Cool neon",
            "referenceImageName": "cool-ref.webp",
            "spec": _SAMPLE_SPEC,
            "isDefault": True,
        },
    )
    assert created_b.errors is None
    style_b = created_b.data["createStyle"]
    assert style_b["isDefault"] is True
    id_b = style_b["id"]

    listed = _execute(_LIST_QUERY)
    assert listed.errors is None
    by_id = {row["id"]: row for row in listed.data["styles"]}
    assert by_id[id_a]["isDefault"] is False
    assert by_id[id_b]["isDefault"] is True

    updated = _execute(
        _UPDATE,
        {
            "id": id_a,
            "name": "Warm editorial v2",
            "isDefault": True,
        },
    )
    assert updated.errors is None
    assert updated.data["updateStyle"]["name"] == "Warm editorial v2"
    assert updated.data["updateStyle"]["isDefault"] is True

    listed2 = _execute(_LIST_QUERY)
    by_id2 = {row["id"]: row for row in listed2.data["styles"]}
    assert by_id2[id_a]["isDefault"] is True
    assert by_id2[id_b]["isDefault"] is False

    one = _execute(_ONE_QUERY, {"id": id_a})
    assert one.errors is None
    assert one.data["style"]["name"] == "Warm editorial v2"
    assert one.data["style"]["spec"]["schemaVersion"] == 2

    deleted = _execute(_DELETE, {"id": id_b})
    assert deleted.errors is None
    assert deleted.data["deleteStyle"] is True

    listed3 = _execute(_LIST_QUERY)
    assert len(listed3.data["styles"]) == 1
    assert listed3.data["styles"][0]["id"] == id_a


def test_create_requires_fields(style_workspace_id: int):
    result = _execute(
        _CREATE,
        {
            "name": "  ",
            "referenceImageName": "a.webp",
            "spec": _SAMPLE_SPEC,
        },
    )
    assert result.errors is not None
    assert any("Name is required" in str(err) for err in result.errors)


def test_create_rejects_invalid_spec(style_workspace_id: int):
    result = _execute(
        _CREATE,
        {
            "name": "Bad",
            "referenceImageName": "a.webp",
            "spec": {"schemaVersion": 2},
        },
    )
    assert result.errors is not None
    assert any("properties" in str(err) for err in result.errors)


def test_get_one_denied_for_other_user(style_workspace_id: int):
    created = _execute(
        _CREATE,
        {
            "name": "Private",
            "referenceImageName": "p.webp",
            "spec": _SAMPLE_SPEC,
        },
    )
    assert created.errors is None
    style_id = created.data["createStyle"]["id"]

    denied = _execute(
        _ONE_QUERY,
        {"id": style_id},
        context_value={"user_id": OTHER_USER_ID},
    )
    assert denied.errors is None
    assert denied.data["style"] is None


def test_update_style_spec_syncs_rules(style_workspace_id: int):
    created = _execute(
        _CREATE,
        {
            "name": "Synced",
            "referenceImageName": "sync.webp",
            "spec": _SAMPLE_SPEC,
        },
    )
    assert created.errors is None
    style_id = created.data["createStyle"]["id"]

    next_spec = {
        "schemaVersion": 2,
        "properties": {
            "tone": {
                "type": "enum",
                "values": ["warm", "cool"],
                "default": "cool",
                "instructions": {
                    "warm": "Warm tones.",
                    "cool": "Cool cyan accents.",
                },
            }
        },
    }
    updated = _execute(_UPDATE, {"id": style_id, "spec": next_spec})
    assert updated.errors is None
    assert "tone: cool → Cool cyan accents." in updated.data["updateStyle"]["rules"]
    assert updated.data["updateStyle"]["spec"]["properties"]["tone"]["default"] == "cool"


def test_create_rejects_v1_style_spec(style_workspace_id: int):
    v1_spec = {
        "schemaVersion": 1,
        "kind": "template",
        "baseRules": ["One rule."],
        "controls": {
            "headline": {
                "type": "enum",
                "values": ["auto"],
                "default": "auto",
                "instructions": {"auto": "Place headline."},
            },
        },
        "defaults": {"headline": "auto"},
    }
    result = _execute(
        _CREATE,
        {
            "name": "Legacy",
            "referenceImageName": "legacy.webp",
            "spec": v1_spec,
        },
    )
    assert result.errors is not None
    assert any("schemaVersion" in str(err) for err in result.errors)
