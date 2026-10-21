"""Pickup offer service: create, close, one-open constraint, public discovery."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime, timedelta

import pytest

from graphql.data_sources import (
    Location,
    ServiceSubscription,
    SessionLocal,
    Workspace,
    WorkspaceMembership,
)
from graphql.data_sources.models.menu import Menu
from graphql.data_sources.models.pickup_offer import PickupOffer
from graphql.schema import schema
from graphql.services.service_subscriptions import (
    SERVICE_KEY_DIGITAL_MENU,
    SERVICE_KEY_PICKUP_OFFER,
    SERVICE_STATUS_ACTIVE,
)
from graphql.services.workspace_plan import WORKSPACE_PLAN_PRO
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context

ACTIVATE = """
mutation Activate($locationId: Int!, $serviceKey: String!) {
  activateServiceSubscription(locationId: $locationId, serviceKey: $serviceKey) {
    id
    serviceKey
    status
  }
}
"""

CREATE = """
mutation CreateOffer($input: CreatePickupOfferInput!) {
  createPickupOffer(input: $input) {
    id
    title
    description
    status
    price
    isLive
    availableFrom
    availableUntil
  }
}
"""

CLOSE = """
mutation CloseOffer($offerId: Int!) {
  closePickupOffer(offerId: $offerId) {
    id
    status
    isLive
  }
}
"""

LIST = """
query Offers($locationId: Int!) {
  pickupOffers(locationId: $locationId) {
    id
    title
    status
    isLive
  }
}
"""

PUBLIC_OFFER = """
query PublicOffer($slug: String!) {
  publicLocationPickupOffer(slug: $slug) {
    id
    title
    description
    price
    isLive
  }
}
"""

HUB = """
query Hub($slug: String!) {
  publicLocation(slug: $slug) {
    services { key available }
    pickupOfferTeaser { title price }
  }
}
"""

DIRECTORY = """
query Directory($hasPickupOffer: Boolean) {
  publicLocations(hasPickupOffer: $hasPickupOffer) {
    locations {
      publicSlug
      hasPickupOffer
      pickupOfferTitle
      pickupOfferPrice
    }
  }
}
"""


def _clear(session) -> None:
    from graphql.tests.pos_cleanup import clear_workspaces_for_owners

    session.query(PickupOffer).delete(synchronize_session=False)
    clear_workspaces_for_owners(session, [GRAPHQL_TEST_USER_ID])
    session.commit()


@pytest.fixture
def pickup_venue():
    session = SessionLocal()
    try:
        _clear(session)
        ws = Workspace(
            name="Pickup WS",
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
            name="Pickup Cafe",
            clerk_user_id=GRAPHQL_TEST_USER_ID,
            workspace_id=ws.id,
            currency="EUR",
            public_slug="pickup-cafe",
            city="Berlin",
        )
        session.add(loc)
        session.flush()
        session.add(Menu(location_id=loc.id, title="", public_enabled=True))
        session.add(
            ServiceSubscription(
                workspace_id=ws.id,
                location_id=loc.id,
                service_key=SERVICE_KEY_DIGITAL_MENU,
                status=SERVICE_STATUS_ACTIVE,
            )
        )
        session.commit()
        session.refresh(loc)
        lid = loc.id
        wid = ws.id
    finally:
        session.close()

    yield {"location_id": lid, "workspace_id": wid}

    session = SessionLocal()
    try:
        _clear(session)
    finally:
        session.close()


def _activate(location_id: int, service_key: str) -> None:
    result = asyncio.run(
        schema.execute(
            ACTIVATE,
            variable_values={"locationId": location_id, "serviceKey": service_key},
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors is None, result.errors


def _window(hours_from: int = 0, hours_until: int = 4) -> tuple[str, str]:
    now = datetime.now(UTC)
    return (
        (now + timedelta(hours=hours_from)).isoformat(),
        (now + timedelta(hours=hours_until)).isoformat(),
    )


def test_activate_requires_digital_menu(pickup_venue):
    lid = pickup_venue["location_id"]
    session = SessionLocal()
    try:
        session.query(ServiceSubscription).filter(
            ServiceSubscription.location_id == lid,
            ServiceSubscription.service_key == SERVICE_KEY_DIGITAL_MENU,
        ).delete(synchronize_session=False)
        session.commit()
    finally:
        session.close()

    result = asyncio.run(
        schema.execute(
            ACTIVATE,
            variable_values={"locationId": lid, "serviceKey": SERVICE_KEY_PICKUP_OFFER},
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors is not None
    assert "digital_menu" in str(result.errors[0]).lower()


def test_create_requires_subscription(pickup_venue):
    lid = pickup_venue["location_id"]
    available_from, available_until = _window()
    result = asyncio.run(
        schema.execute(
            CREATE,
            variable_values={
                "input": {
                    "locationId": lid,
                    "title": "Rice bag",
                    "description": "1kg rice + veg",
                    "availableFrom": available_from,
                    "availableUntil": available_until,
                    "price": 5.0,
                }
            },
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors is not None
    assert "pickup_offer" in str(result.errors[0]).lower()


def test_create_close_and_one_open(pickup_venue):
    lid = pickup_venue["location_id"]
    _activate(lid, SERVICE_KEY_PICKUP_OFFER)
    available_from, available_until = _window()

    created = asyncio.run(
        schema.execute(
            CREATE,
            variable_values={
                "input": {
                    "locationId": lid,
                    "title": "Surprise bag",
                    "description": "Rice and vegetables",
                    "availableFrom": available_from,
                    "availableUntil": available_until,
                    "price": 4.5,
                }
            },
            context_value=graphql_auth_context(),
        )
    )
    assert created.errors is None, created.errors
    offer = created.data["createPickupOffer"]
    assert offer["title"] == "Surprise bag"
    assert offer["status"] == "open"
    assert offer["isLive"] is True
    assert offer["price"] == 4.5
    offer_id = offer["id"]

    duplicate = asyncio.run(
        schema.execute(
            CREATE,
            variable_values={
                "input": {
                    "locationId": lid,
                    "title": "Another",
                    "description": "Nope",
                    "availableFrom": available_from,
                    "availableUntil": available_until,
                }
            },
            context_value=graphql_auth_context(),
        )
    )
    assert duplicate.errors is not None
    assert "already exists" in str(duplicate.errors[0]).lower()

    listed = asyncio.run(
        schema.execute(
            LIST,
            variable_values={"locationId": lid},
            context_value=graphql_auth_context(),
        )
    )
    assert listed.errors is None, listed.errors
    assert len(listed.data["pickupOffers"]) == 1

    closed = asyncio.run(
        schema.execute(
            CLOSE,
            variable_values={"offerId": offer_id},
            context_value=graphql_auth_context(),
        )
    )
    assert closed.errors is None, closed.errors
    assert closed.data["closePickupOffer"]["status"] == "closed"
    assert closed.data["closePickupOffer"]["isLive"] is False

    again = asyncio.run(
        schema.execute(
            CREATE,
            variable_values={
                "input": {
                    "locationId": lid,
                    "title": "Second bag",
                    "description": "More rice",
                    "availableFrom": available_from,
                    "availableUntil": available_until,
                }
            },
            context_value=graphql_auth_context(),
        )
    )
    assert again.errors is None, again.errors
    assert again.data["createPickupOffer"]["title"] == "Second bag"


def test_public_hub_teaser_and_directory_filter(pickup_venue):
    lid = pickup_venue["location_id"]
    _activate(lid, SERVICE_KEY_PICKUP_OFFER)
    available_from, available_until = _window()

    created = asyncio.run(
        schema.execute(
            CREATE,
            variable_values={
                "input": {
                    "locationId": lid,
                    "title": "Closing bag",
                    "description": "Whatever is left",
                    "availableFrom": available_from,
                    "availableUntil": available_until,
                    "price": 3.0,
                }
            },
            context_value=graphql_auth_context(),
        )
    )
    assert created.errors is None, created.errors

    hub = asyncio.run(schema.execute(HUB, variable_values={"slug": "pickup-cafe"}))
    assert hub.errors is None, hub.errors
    services = {s["key"]: s["available"] for s in hub.data["publicLocation"]["services"]}
    assert services.get(SERVICE_KEY_PICKUP_OFFER) is True
    teaser = hub.data["publicLocation"]["pickupOfferTeaser"]
    assert teaser is not None
    assert teaser["title"] == "Closing bag"
    assert teaser["price"] == 3.0

    public = asyncio.run(
        schema.execute(PUBLIC_OFFER, variable_values={"slug": "pickup-cafe"})
    )
    assert public.errors is None, public.errors
    assert public.data["publicLocationPickupOffer"]["title"] == "Closing bag"
    assert public.data["publicLocationPickupOffer"]["isLive"] is True

    filtered = asyncio.run(
        schema.execute(DIRECTORY, variable_values={"hasPickupOffer": True})
    )
    assert filtered.errors is None, filtered.errors
    rows = filtered.data["publicLocations"]["locations"]
    assert any(r["publicSlug"] == "pickup-cafe" and r["hasPickupOffer"] for r in rows)
    match = next(r for r in rows if r["publicSlug"] == "pickup-cafe")
    assert match["pickupOfferTitle"] == "Closing bag"
    assert match["pickupOfferPrice"] == 3.0


def test_reject_past_available_until(pickup_venue):
    lid = pickup_venue["location_id"]
    _activate(lid, SERVICE_KEY_PICKUP_OFFER)
    past_from = (datetime.now(UTC) - timedelta(hours=5)).isoformat()
    past_until = (datetime.now(UTC) - timedelta(hours=1)).isoformat()

    created = asyncio.run(
        schema.execute(
            CREATE,
            variable_values={
                "input": {
                    "locationId": lid,
                    "title": "Old bag",
                    "description": "Gone",
                    "availableFrom": past_from,
                    "availableUntil": past_until,
                }
            },
            context_value=graphql_auth_context(),
        )
    )
    assert created.errors is not None
    assert "future" in str(created.errors[0]).lower()


def test_lazy_close_makes_expired_not_public(pickup_venue):
    lid = pickup_venue["location_id"]
    _activate(lid, SERVICE_KEY_PICKUP_OFFER)
    available_from, available_until = _window(hours_from=0, hours_until=2)

    created = asyncio.run(
        schema.execute(
            CREATE,
            variable_values={
                "input": {
                    "locationId": lid,
                    "title": "Soon gone",
                    "description": "Temp",
                    "availableFrom": available_from,
                    "availableUntil": available_until,
                }
            },
            context_value=graphql_auth_context(),
        )
    )
    assert created.errors is None, created.errors
    offer_id = created.data["createPickupOffer"]["id"]

    session = SessionLocal()
    try:
        row = session.get(PickupOffer, offer_id)
        assert row is not None
        row.available_until = datetime.now(UTC) - timedelta(minutes=1)
        session.commit()
    finally:
        session.close()

    public = asyncio.run(
        schema.execute(PUBLIC_OFFER, variable_values={"slug": "pickup-cafe"})
    )
    assert public.errors is None, public.errors
    assert public.data["publicLocationPickupOffer"] is None
