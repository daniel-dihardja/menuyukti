"""Tests for authenticated menu item feedback submit + owner moderation."""

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
from graphql.data_sources.models.menu import Menu, MenuCategory, MenuItem
from graphql.data_sources.models.menu_item_feedback import MenuItemFeedback
from graphql.schema import schema
from graphql.services.service_subscriptions import (
    SERVICE_KEY_DIGITAL_MENU,
    SERVICE_STATUS_ACTIVE,
)
from graphql.services.workspace_plan import WORKSPACE_PLAN_PRO
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID
from graphql.tests.pos_cleanup import clear_location_dependents

GUEST_USER_ID = "clerk_guest_feedback"
OTHER_GUEST_ID = "clerk_other_feedback"

_SUBMIT_ORDER = """
mutation SubmitPublicMenuOrder(
  $locationId: Int!
  $lines: [PublicMenuOrderLineInput!]!
  $fulfillmentMode: PosFulfillmentMode!
  $tableLabel: String
) {
  submitPublicMenuOrder(
    locationId: $locationId
    lines: $lines
    fulfillmentMode: $fulfillmentMode
    tableLabel: $tableLabel
  ) {
    id
  }
}
"""

_SUBMIT_FEEDBACK = """
mutation SubmitFeedback(
  $locationId: Int!
  $menuItemId: Int!
  $body: String!
  $sentiment: MenuItemFeedbackSentiment
  $guestDisplayName: String
  $posOrderId: Int
) {
  submitMenuItemFeedback(
    locationId: $locationId
    menuItemId: $menuItemId
    body: $body
    sentiment: $sentiment
    guestDisplayName: $guestDisplayName
    posOrderId: $posOrderId
  ) {
    id
    status
    sentiment
    body
    menuItemId
    posOrderId
  }
}
"""

_LIST = """
query ListFeedback($locationId: Int!, $status: MenuItemFeedbackStatus) {
  locationMenuItemFeedbacks(locationId: $locationId, status: $status) {
    id
    status
    body
    ownerReply
    menuItemName
  }
  locationMenuItemFeedbackPendingCount(locationId: $locationId)
}
"""

_REPLY = """
mutation Reply($feedbackId: Int!, $reply: String!) {
  replyMenuItemFeedback(feedbackId: $feedbackId, reply: $reply) {
    id
    ownerReply
  }
}
"""

_PUBLISH = """
mutation Publish($feedbackId: Int!) {
  publishMenuItemFeedback(feedbackId: $feedbackId) {
    id
    status
  }
}
"""

_HIDE = """
mutation Hide($feedbackId: Int!) {
  hideMenuItemFeedback(feedbackId: $feedbackId) {
    id
    status
  }
}
"""

_PUBLIC_MENU = """
query PublicMenu($slug: String!) {
  publicLocationMenu(slug: $slug) {
    categories {
      items {
        id
        publishedFeedbackCount
        publishedFeedbacks {
          body
          sentiment
          ownerReply
          guestDisplayName
        }
      }
    }
  }
}
"""


@pytest.fixture
def feedback_location():
    session = SessionLocal()
    try:
        ws = Workspace(
            name="Feedback WS",
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
            name="Feedback Loc",
            clerk_user_id=GRAPHQL_TEST_USER_ID,
            workspace_id=ws.id,
            currency="EUR",
            public_slug="feedback-cafe",
        )
        session.add(loc)
        session.flush()
        session.add(
            ServiceSubscription(
                workspace_id=ws.id,
                location_id=loc.id,
                service_key=SERVICE_KEY_DIGITAL_MENU,
                status=SERVICE_STATUS_ACTIVE,
            )
        )
        menu = Menu(location_id=loc.id, title="", public_enabled=True)
        session.add(menu)
        session.flush()
        cat = MenuCategory(menu_id=menu.id, name="Mains", sort_order=0)
        session.add(cat)
        session.flush()
        item = MenuItem(
            menu_id=menu.id,
            category_id=cat.id,
            name="Nasi Goreng",
            description="Fried rice",
            price=12.0,
            sort_order=0,
            is_available=True,
        )
        session.add(item)
        session.commit()
        session.refresh(loc)
        session.refresh(item)
        lid = loc.id
        item_id = item.id
        wid = ws.id
        slug = loc.public_slug
    finally:
        session.close()

    yield lid, item_id, slug

    session = SessionLocal()
    try:
        clear_location_dependents(session, [lid])
        session.query(Location).filter(Location.id == lid).delete()
        session.query(WorkspaceMembership).filter(WorkspaceMembership.workspace_id == wid).delete()
        session.query(Workspace).filter(Workspace.id == wid).delete()
        session.commit()
    finally:
        session.close()


def _submit_order(location_id: int, item_id: int, user_id: str = GUEST_USER_ID) -> int:
    result = asyncio.run(
        schema.execute(
            _SUBMIT_ORDER,
            variable_values={
                "locationId": location_id,
                "lines": [{"menuItemId": item_id, "qty": 1}],
                "fulfillmentMode": "DINE_IN",
                "tableLabel": "A1",
            },
            context_value={"user_id": user_id},
        )
    )
    assert result.errors is None, result.errors
    return int(result.data["submitPublicMenuOrder"]["id"])


def test_submit_requires_auth(feedback_location):
    location_id, item_id, _slug = feedback_location
    result = asyncio.run(
        schema.execute(
            _SUBMIT_FEEDBACK,
            variable_values={
                "locationId": location_id,
                "menuItemId": item_id,
                "sentiment": "POSITIVE",
                "body": "Great dish",
            },
            context_value={},
        )
    )
    assert result.errors
    assert "authenticated" in str(result.errors[0]).lower()


def test_submit_without_order_succeeds(feedback_location):
    location_id, item_id, _slug = feedback_location
    result = asyncio.run(
        schema.execute(
            _SUBMIT_FEEDBACK,
            variable_values={
                "locationId": location_id,
                "menuItemId": item_id,
                "sentiment": "POSITIVE",
                "body": "Looks great",
            },
            context_value={"user_id": GUEST_USER_ID},
        )
    )
    assert result.errors is None, result.errors
    feedback = result.data["submitMenuItemFeedback"]
    assert feedback["status"] == "PENDING"
    assert feedback["posOrderId"] is None


def test_submit_without_sentiment_succeeds(feedback_location):
    location_id, item_id, _slug = feedback_location
    result = asyncio.run(
        schema.execute(
            _SUBMIT_FEEDBACK,
            variable_values={
                "locationId": location_id,
                "menuItemId": item_id,
                "body": "Just a note, no thumbs",
            },
            context_value={"user_id": GUEST_USER_ID},
        )
    )
    assert result.errors is None, result.errors
    feedback = result.data["submitMenuItemFeedback"]
    assert feedback["status"] == "PENDING"
    assert feedback["sentiment"] is None
    assert feedback["body"] == "Just a note, no thumbs"


def test_submit_positive_without_body_succeeds(feedback_location):
    location_id, item_id, _slug = feedback_location
    result = asyncio.run(
        schema.execute(
            _SUBMIT_FEEDBACK,
            variable_values={
                "locationId": location_id,
                "menuItemId": item_id,
                "sentiment": "POSITIVE",
                "body": "",
            },
            context_value={"user_id": GUEST_USER_ID},
        )
    )
    assert result.errors is None, result.errors
    feedback = result.data["submitMenuItemFeedback"]
    assert feedback["sentiment"] == "POSITIVE"
    assert feedback["body"] == ""


def test_submit_negative_without_body_rejected(feedback_location):
    location_id, item_id, _slug = feedback_location
    result = asyncio.run(
        schema.execute(
            _SUBMIT_FEEDBACK,
            variable_values={
                "locationId": location_id,
                "menuItemId": item_id,
                "sentiment": "NEGATIVE",
                "body": "",
            },
            context_value={"user_id": GUEST_USER_ID},
        )
    )
    assert result.errors
    assert "thumbs down" in str(result.errors[0]).lower()


def test_submit_rejects_other_guests_order(feedback_location):
    location_id, item_id, _slug = feedback_location
    order_id = _submit_order(location_id, item_id, user_id=GUEST_USER_ID)
    result = asyncio.run(
        schema.execute(
            _SUBMIT_FEEDBACK,
            variable_values={
                "locationId": location_id,
                "menuItemId": item_id,
                "posOrderId": order_id,
                "sentiment": "POSITIVE",
                "body": "Nope",
            },
            context_value={"user_id": OTHER_GUEST_ID},
        )
    )
    assert result.errors
    assert "does not belong" in str(result.errors[0]).lower()


def test_submit_uniqueness_and_owner_publish_visibility(feedback_location):
    location_id, item_id, slug = feedback_location
    order_id = _submit_order(location_id, item_id)

    created = asyncio.run(
        schema.execute(
            _SUBMIT_FEEDBACK,
            variable_values={
                "locationId": location_id,
                "menuItemId": item_id,
                "posOrderId": order_id,
                "sentiment": "POSITIVE",
                "body": "Loved it",
                "guestDisplayName": "Alex",
            },
            context_value={"user_id": GUEST_USER_ID},
        )
    )
    assert created.errors is None, created.errors
    feedback = created.data["submitMenuItemFeedback"]
    assert feedback["status"] == "PENDING"
    assert feedback["posOrderId"] == order_id
    feedback_id = int(feedback["id"])

    dup = asyncio.run(
        schema.execute(
            _SUBMIT_FEEDBACK,
            variable_values={
                "locationId": location_id,
                "menuItemId": item_id,
                "sentiment": "NEGATIVE",
                "body": "Again",
            },
            context_value={"user_id": GUEST_USER_ID},
        )
    )
    assert dup.errors
    assert "already" in str(dup.errors[0]).lower()

    public_before = asyncio.run(
        schema.execute(_PUBLIC_MENU, variable_values={"slug": slug}, context_value={})
    )
    assert public_before.errors is None, public_before.errors
    item = public_before.data["publicLocationMenu"]["categories"][0]["items"][0]
    assert item["id"] == item_id
    assert item["publishedFeedbackCount"] == 0
    assert item["publishedFeedbacks"] == []

    inbox = asyncio.run(
        schema.execute(
            _LIST,
            variable_values={"locationId": location_id},
            context_value={"user_id": GRAPHQL_TEST_USER_ID},
        )
    )
    assert inbox.errors is None, inbox.errors
    assert inbox.data["locationMenuItemFeedbackPendingCount"] == 1
    assert len(inbox.data["locationMenuItemFeedbacks"]) == 1

    reply = asyncio.run(
        schema.execute(
            _REPLY,
            variable_values={"feedbackId": feedback_id, "reply": "Thanks!"},
            context_value={"user_id": GRAPHQL_TEST_USER_ID},
        )
    )
    assert reply.errors is None, reply.errors
    assert reply.data["replyMenuItemFeedback"]["ownerReply"] == "Thanks!"

    published = asyncio.run(
        schema.execute(
            _PUBLISH,
            variable_values={"feedbackId": feedback_id},
            context_value={"user_id": GRAPHQL_TEST_USER_ID},
        )
    )
    assert published.errors is None, published.errors
    assert published.data["publishMenuItemFeedback"]["status"] == "PUBLISHED"

    public_after = asyncio.run(
        schema.execute(_PUBLIC_MENU, variable_values={"slug": slug}, context_value={})
    )
    assert public_after.errors is None, public_after.errors
    item_after = public_after.data["publicLocationMenu"]["categories"][0]["items"][0]
    assert item_after["publishedFeedbackCount"] == 1
    assert len(item_after["publishedFeedbacks"]) == 1
    assert item_after["publishedFeedbacks"][0]["body"] == "Loved it"
    assert item_after["publishedFeedbacks"][0]["ownerReply"] == "Thanks!"
    assert item_after["publishedFeedbacks"][0]["guestDisplayName"] == "Alex"

    hidden = asyncio.run(
        schema.execute(
            _HIDE,
            variable_values={"feedbackId": feedback_id},
            context_value={"user_id": GRAPHQL_TEST_USER_ID},
        )
    )
    assert hidden.errors is None, hidden.errors
    assert hidden.data["hideMenuItemFeedback"]["status"] == "HIDDEN"

    public_hidden = asyncio.run(
        schema.execute(_PUBLIC_MENU, variable_values={"slug": slug}, context_value={})
    )
    item_hidden = public_hidden.data["publicLocationMenu"]["categories"][0]["items"][0]
    assert item_hidden["publishedFeedbackCount"] == 0
    assert item_hidden["publishedFeedbacks"] == []


def test_owner_inbox_empty_for_non_owner(feedback_location):
    location_id, _item_id, _slug = feedback_location
    result = asyncio.run(
        schema.execute(
            _LIST,
            variable_values={"locationId": location_id},
            context_value={"user_id": GUEST_USER_ID},
        )
    )
    assert result.errors is None, result.errors
    assert result.data["locationMenuItemFeedbacks"] == []
    assert result.data["locationMenuItemFeedbackPendingCount"] == 0


def test_feedback_model_constants_roundtrip(feedback_location):
    """Ensure ORM table is writable via service path used above."""
    location_id, item_id, _slug = feedback_location
    created = asyncio.run(
        schema.execute(
            _SUBMIT_FEEDBACK,
            variable_values={
                "locationId": location_id,
                "menuItemId": item_id,
                "sentiment": "NEGATIVE",
                "body": "Too salty",
            },
            context_value={"user_id": GUEST_USER_ID},
        )
    )
    assert created.errors is None, created.errors
    session = SessionLocal()
    try:
        row = session.get(MenuItemFeedback, int(created.data["submitMenuItemFeedback"]["id"]))
        assert row is not None
        assert row.sentiment == "negative"
        assert row.status == "pending"
        assert row.pos_order_id is None
    finally:
        session.close()
