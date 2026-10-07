"""Service subscriptions: activate, cancel, query, publish gate."""

from __future__ import annotations

import asyncio

import pytest
from graphql.data_sources import (
    Location,
    ServiceSubscription,
    SessionLocal,
    Workspace,
    WorkspaceMembership,
)
from graphql.data_sources.models.menu import Menu
from graphql.schema import schema
from graphql.services.service_subscriptions import (
    SERVICE_KEY_DIGITAL_MENU,
    SERVICE_KEY_POINT_SYSTEM,
    SERVICE_STATUS_ACTIVE,
    SERVICE_STATUS_CANCELED,
)
from graphql.services.workspace_plan import WORKSPACE_PLAN_PRO
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context

ACTIVATE = """
mutation Activate($locationId: Int!, $serviceKey: String!) {
  activateServiceSubscription(locationId: $locationId, serviceKey: $serviceKey) {
    id
    workspaceId
    locationId
    serviceKey
    status
    canceledAt
  }
}
"""

CANCEL = """
mutation Cancel($locationId: Int!, $serviceKey: String!) {
  cancelServiceSubscription(locationId: $locationId, serviceKey: $serviceKey) {
    id
    serviceKey
    status
    canceledAt
  }
}
"""

MY_SUBS = """
query MySubs($includeCanceled: Boolean) {
  myServiceSubscriptions(includeCanceled: $includeCanceled) {
    id
    locationId
    serviceKey
    status
  }
}
"""

UPDATE_PUBLIC = """
mutation UpdatePublicMenu(
  $locationId: Int!
  $publicEnabled: Boolean
  $publicSlug: String
) {
  updateLocationPublicMenu(
    locationId: $locationId
    publicEnabled: $publicEnabled
    publicSlug: $publicSlug
  ) {
    locationId
    publicEnabled
    publicSlug
  }
}
"""

OTHER_USER = "clerk_other_user"


def _clear(session) -> None:
    session.query(ServiceSubscription).filter(
        ServiceSubscription.workspace_id.in_(
            session.query(Workspace.id).filter(
                Workspace.owner_clerk_user_id.in_([GRAPHQL_TEST_USER_ID, OTHER_USER])
            )
        )
    ).delete(synchronize_session=False)
    session.query(Menu).filter(
        Menu.location_id.in_(
            session.query(Location.id).filter(
                Location.clerk_user_id.in_([GRAPHQL_TEST_USER_ID, OTHER_USER])
            )
        )
    ).delete(synchronize_session=False)
    session.query(Location).filter(
        Location.clerk_user_id.in_([GRAPHQL_TEST_USER_ID, OTHER_USER])
    ).delete()
    session.query(WorkspaceMembership).filter(
        WorkspaceMembership.clerk_user_id.in_([GRAPHQL_TEST_USER_ID, OTHER_USER])
    ).delete()
    session.query(Workspace).filter(
        Workspace.owner_clerk_user_id.in_([GRAPHQL_TEST_USER_ID, OTHER_USER])
    ).delete()
    session.commit()


@pytest.fixture
def subscription_location():
    session = SessionLocal()
    try:
        _clear(session)
        ws = Workspace(
            name="Sub WS",
            owner_clerk_user_id=GRAPHQL_TEST_USER_ID,
            plan=WORKSPACE_PLAN_PRO,
        )
        session.add(ws)
        session.flush()
        session.add(
            WorkspaceMembership(
                workspace_id=ws.id,
                clerk_user_id=GRAPHQL_TEST_USER_ID,
                role="owner",
            )
        )
        loc = Location(
            name="Sub Loc",
            clerk_user_id=GRAPHQL_TEST_USER_ID,
            workspace_id=ws.id,
            currency="EUR",
        )
        session.add(loc)
        session.commit()
        session.refresh(loc)
        session.refresh(ws)
        lid, wid = loc.id, ws.id
    finally:
        session.close()
    yield {"location_id": lid, "workspace_id": wid}
    session = SessionLocal()
    try:
        _clear(session)
    finally:
        session.close()


def test_activate_and_query(subscription_location):
    lid = subscription_location["location_id"]
    result = asyncio.run(
        schema.execute(
            ACTIVATE,
            variable_values={"locationId": lid, "serviceKey": SERVICE_KEY_DIGITAL_MENU},
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors is None
    row = result.data["activateServiceSubscription"]
    assert row["serviceKey"] == SERVICE_KEY_DIGITAL_MENU
    assert row["status"] == SERVICE_STATUS_ACTIVE
    assert row["canceledAt"] is None
    assert int(row["locationId"]) == lid

    listed = asyncio.run(
        schema.execute(MY_SUBS, variable_values={}, context_value=graphql_auth_context())
    )
    assert listed.errors is None
    assert len(listed.data["myServiceSubscriptions"]) == 1
    assert listed.data["myServiceSubscriptions"][0]["serviceKey"] == SERVICE_KEY_DIGITAL_MENU


def test_activate_and_cancel_point_system(subscription_location):
    lid = subscription_location["location_id"]
    activate = asyncio.run(
        schema.execute(
            ACTIVATE,
            variable_values={"locationId": lid, "serviceKey": SERVICE_KEY_POINT_SYSTEM},
            context_value=graphql_auth_context(),
        )
    )
    assert activate.errors is None
    row = activate.data["activateServiceSubscription"]
    assert row["serviceKey"] == SERVICE_KEY_POINT_SYSTEM
    assert row["status"] == SERVICE_STATUS_ACTIVE

    cancel = asyncio.run(
        schema.execute(
            CANCEL,
            variable_values={"locationId": lid, "serviceKey": SERVICE_KEY_POINT_SYSTEM},
            context_value=graphql_auth_context(),
        )
    )
    assert cancel.errors is None
    assert cancel.data["cancelServiceSubscription"]["status"] == SERVICE_STATUS_CANCELED
    assert cancel.data["cancelServiceSubscription"]["canceledAt"] is not None


def test_activate_is_idempotent_upsert(subscription_location):
    lid = subscription_location["location_id"]
    first = asyncio.run(
        schema.execute(
            ACTIVATE,
            variable_values={"locationId": lid, "serviceKey": "digital_menu"},
            context_value=graphql_auth_context(),
        )
    )
    second = asyncio.run(
        schema.execute(
            ACTIVATE,
            variable_values={"locationId": lid, "serviceKey": "digital_menu"},
            context_value=graphql_auth_context(),
        )
    )
    assert first.errors is None and second.errors is None
    assert (
        first.data["activateServiceSubscription"]["id"]
        == second.data["activateServiceSubscription"]["id"]
    )


def test_cancel_unpublishes_digital_menu(subscription_location):
    lid = subscription_location["location_id"]
    asyncio.run(
        schema.execute(
            ACTIVATE,
            variable_values={"locationId": lid, "serviceKey": SERVICE_KEY_DIGITAL_MENU},
            context_value=graphql_auth_context(),
        )
    )
    enable = asyncio.run(
        schema.execute(
            UPDATE_PUBLIC,
            variable_values={
                "locationId": lid,
                "publicEnabled": True,
                "publicSlug": "sub-pub-cafe",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert enable.errors is None
    assert enable.data["updateLocationPublicMenu"]["publicEnabled"] is True

    cancel = asyncio.run(
        schema.execute(
            CANCEL,
            variable_values={"locationId": lid, "serviceKey": SERVICE_KEY_DIGITAL_MENU},
            context_value=graphql_auth_context(),
        )
    )
    assert cancel.errors is None
    assert cancel.data["cancelServiceSubscription"]["status"] == SERVICE_STATUS_CANCELED
    assert cancel.data["cancelServiceSubscription"]["canceledAt"] is not None

    session = SessionLocal()
    try:
        menu = session.query(Menu).filter(Menu.location_id == lid).one()
        assert menu.public_enabled is False
    finally:
        session.close()

    active_only = asyncio.run(
        schema.execute(MY_SUBS, variable_values={}, context_value=graphql_auth_context())
    )
    assert active_only.data["myServiceSubscriptions"] == []

    with_canceled = asyncio.run(
        schema.execute(
            MY_SUBS,
            variable_values={"includeCanceled": True},
            context_value=graphql_auth_context(),
        )
    )
    assert len(with_canceled.data["myServiceSubscriptions"]) == 1
    assert with_canceled.data["myServiceSubscriptions"][0]["status"] == SERVICE_STATUS_CANCELED


def test_publish_requires_active_subscription(subscription_location):
    lid = subscription_location["location_id"]
    result = asyncio.run(
        schema.execute(
            UPDATE_PUBLIC,
            variable_values={
                "locationId": lid,
                "publicEnabled": True,
                "publicSlug": "needs-sub",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors
    assert any("digital_menu subscription" in str(e) for e in result.errors)


def test_activate_denied_for_non_owner(subscription_location):
    lid = subscription_location["location_id"]
    result = asyncio.run(
        schema.execute(
            ACTIVATE,
            variable_values={"locationId": lid, "serviceKey": SERVICE_KEY_DIGITAL_MENU},
            context_value={"user_id": OTHER_USER},
        )
    )
    assert result.errors
    assert any("Access denied" in str(e) for e in result.errors)


def test_invalid_service_key(subscription_location):
    lid = subscription_location["location_id"]
    result = asyncio.run(
        schema.execute(
            ACTIVATE,
            variable_values={"locationId": lid, "serviceKey": "not_a_service"},
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors
    assert any("Invalid service key" in str(e) for e in result.errors)


def test_reactivate_after_cancel(subscription_location):
    lid = subscription_location["location_id"]
    asyncio.run(
        schema.execute(
            ACTIVATE,
            variable_values={"locationId": lid, "serviceKey": SERVICE_KEY_DIGITAL_MENU},
            context_value=graphql_auth_context(),
        )
    )
    asyncio.run(
        schema.execute(
            CANCEL,
            variable_values={"locationId": lid, "serviceKey": SERVICE_KEY_DIGITAL_MENU},
            context_value=graphql_auth_context(),
        )
    )
    again = asyncio.run(
        schema.execute(
            ACTIVATE,
            variable_values={"locationId": lid, "serviceKey": SERVICE_KEY_DIGITAL_MENU},
            context_value=graphql_auth_context(),
        )
    )
    assert again.errors is None
    assert again.data["activateServiceSubscription"]["status"] == SERVICE_STATUS_ACTIVE
    assert again.data["activateServiceSubscription"]["canceledAt"] is None
