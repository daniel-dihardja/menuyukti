"""Platform-admin gate for global image AI flow mutations."""

from __future__ import annotations

import pytest
from graphql.platform_admin import clear_platform_admin_cache
from graphql.schema import schema
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context

_CREATE = """
mutation CreateFlow($slug: String!) {
  createImageAiFlow(
    slug: $slug
    displayName: "Test Flow"
    prompt: "do the thing"
    model: "test-model"
  ) {
    slug
    displayName
  }
}
"""

_DELETE = """
mutation DeleteFlow($slug: String!) {
  deleteImageAiFlow(slug: $slug)
}
"""


@pytest.fixture(autouse=True)
def _reset_admin_allowlist(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.delenv("MENUYUKTI_ADMIN_USER_IDS", raising=False)
    clear_platform_admin_cache()
    yield
    clear_platform_admin_cache()


def test_create_image_ai_flow_denied_without_allowlist():
    result = schema.execute_sync(
        _CREATE,
        variable_values={"slug": "p0-denied-flow"},
        context_value=graphql_auth_context(),
    )
    assert result.errors
    assert any("Access denied" in str(err) for err in result.errors)


def test_create_and_delete_image_ai_flow_allowed_for_platform_admin(
    monkeypatch: pytest.MonkeyPatch,
):
    monkeypatch.setenv("MENUYUKTI_ADMIN_USER_IDS", GRAPHQL_TEST_USER_ID)
    clear_platform_admin_cache()
    slug = "p0-admin-flow"

    created = schema.execute_sync(
        _CREATE,
        variable_values={"slug": slug},
        context_value=graphql_auth_context(),
    )
    assert created.errors is None, created.errors
    assert created.data is not None
    assert created.data["createImageAiFlow"]["slug"] == slug

    deleted = schema.execute_sync(
        _DELETE,
        variable_values={"slug": slug},
        context_value=graphql_auth_context(),
    )
    assert deleted.errors is None, deleted.errors
    assert deleted.data is not None
    assert deleted.data["deleteImageAiFlow"] is True


def test_create_image_ai_flow_denied_for_non_admin(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("MENUYUKTI_ADMIN_USER_IDS", "clerk_other_admin")
    clear_platform_admin_cache()
    result = schema.execute_sync(
        _CREATE,
        variable_values={"slug": "p0-non-admin-flow"},
        context_value=graphql_auth_context(),
    )
    assert result.errors
    assert any("Access denied" in str(err) for err in result.errors)
