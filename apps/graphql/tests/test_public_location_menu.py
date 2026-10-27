"""Tests for publicLocationMenu and updateLocationPublicMenu."""

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
from graphql.schema import schema
from graphql.services.service_subscriptions import (
    SERVICE_KEY_DIGITAL_MENU,
    SERVICE_STATUS_ACTIVE,
)
from graphql.services.workspace_plan import WORKSPACE_PLAN_PRO
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context

_PUBLIC_MENU_QUERY = """
query PublicMenu($slug: String!) {
  publicLocationMenu(slug: $slug) {
    locationId
    name
    publicSlug
    currency
    workspaceId
    mediaOwnerClerkUserId
    headerImageFilename
    orderingEnabled
    allowDineIn
    allowPickup
    allowDelivery
    categories {
      name
      sortOrder
      items {
        id
        name
        price
        sortOrder
        description
        imageFilename
        dietaryTags
        allergens
      }
    }
  }
}
"""

_MUTATION = """
mutation UpdatePublicMenu(
  $locationId: Int!
  $publicEnabled: Boolean
  $publicSlug: String
  $headerImageFilename: String
  $orderingEnabled: Boolean
  $allowDineIn: Boolean
  $allowPickup: Boolean
  $allowDelivery: Boolean
) {
  updateLocationPublicMenu(
    locationId: $locationId
    publicEnabled: $publicEnabled
    publicSlug: $publicSlug
    headerImageFilename: $headerImageFilename
    orderingEnabled: $orderingEnabled
    allowDineIn: $allowDineIn
    allowPickup: $allowPickup
    allowDelivery: $allowDelivery
  ) {
    locationId
    publicEnabled
    publicSlug
    menu {
      id
      locationId
      publicEnabled
      orderingEnabled
      allowDineIn
      allowPickup
      allowDelivery
      headerImageFilename
    }
  }
}
"""


@pytest.fixture
def menu_location_id():
    session = SessionLocal()
    try:
        ws = Workspace(
            name="Menu Pub WS",
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
            name="Menu Pub Loc",
            clerk_user_id=GRAPHQL_TEST_USER_ID,
            workspace_id=ws.id,
            currency="EUR",
            public_slug=None,
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
        session.commit()
        session.refresh(loc)
        lid = loc.id
        wid = ws.id
    finally:
        session.close()
    yield lid
    session = SessionLocal()
    try:
        session.query(ServiceSubscription).filter(ServiceSubscription.location_id == lid).delete()
        session.query(MenuItem).filter(
            MenuItem.menu_id.in_(session.query(Menu.id).filter(Menu.location_id == lid))
        ).delete(synchronize_session=False)
        session.query(MenuCategory).filter(
            MenuCategory.menu_id.in_(session.query(Menu.id).filter(Menu.location_id == lid))
        ).delete(synchronize_session=False)
        session.query(Menu).filter(Menu.location_id == lid).delete()
        session.query(Location).filter(Location.id == lid).delete()
        session.query(WorkspaceMembership).filter(WorkspaceMembership.workspace_id == wid).delete()
        session.query(Workspace).filter(Workspace.id == wid).delete()
        session.commit()
    finally:
        session.close()


def test_public_menu_null_when_missing_or_disabled(menu_location_id):
    result = asyncio.run(
        schema.execute(
            _PUBLIC_MENU_QUERY,
            variable_values={"slug": "does-not-exist"},
            context_value={},
        )
    )
    assert result.errors is None
    assert result.data["publicLocationMenu"] is None

    session = SessionLocal()
    try:
        loc = session.get(Location, menu_location_id)
        assert loc is not None
        loc.public_slug = "menu-test-loc"
        session.add(Menu(location_id=menu_location_id, title="", public_enabled=False))
        session.commit()
    finally:
        session.close()

    result2 = asyncio.run(
        schema.execute(
            _PUBLIC_MENU_QUERY,
            variable_values={"slug": "menu-test-loc"},
            context_value={},
        )
    )
    assert result2.errors is None
    assert result2.data["publicLocationMenu"] is None


def test_public_menu_hides_unavailable_items(menu_location_id):
    session = SessionLocal()
    try:
        loc = session.get(Location, menu_location_id)
        assert loc is not None
        loc.public_slug = "menu-available-loc"
        menu = Menu(location_id=menu_location_id, title="", public_enabled=True)
        session.add(menu)
        session.flush()
        cat = MenuCategory(menu_id=menu.id, name="Drinks", sort_order=0)
        session.add(cat)
        session.flush()
        session.add_all(
            [
                MenuItem(
                    menu_id=menu.id,
                    category_id=cat.id,
                    name="Espresso",
                    description="Double shot",
                    price=2.5,
                    sort_order=0,
                    is_available=True,
                    image_filename="espresso.webp",
                    dietary_tags=["vegan", "dairy_free"],
                    allergens=["gluten"],
                ),
                MenuItem(
                    menu_id=menu.id,
                    category_id=cat.id,
                    name="Sold Out Latte",
                    description="Oat milk",
                    price=4.0,
                    sort_order=1,
                    is_available=False,
                    image_filename="latte.webp",
                ),
            ]
        )
        session.commit()
    finally:
        session.close()

    result = asyncio.run(
        schema.execute(
            _PUBLIC_MENU_QUERY,
            variable_values={"slug": "menu-available-loc"},
            context_value={},
        )
    )
    assert result.errors is None
    pub = result.data["publicLocationMenu"]
    assert pub is not None
    assert pub["name"] == "Menu Pub Loc"
    assert pub["currency"] == "EUR"
    assert pub["mediaOwnerClerkUserId"] == GRAPHQL_TEST_USER_ID
    assert pub["workspaceId"] is not None
    assert len(pub["categories"]) == 1
    items = pub["categories"][0]["items"]
    assert [item["name"] for item in items] == ["Espresso"]
    assert isinstance(items[0]["id"], int)
    assert items[0]["id"] > 0
    assert items[0]["description"] == "Double shot"
    assert items[0]["imageFilename"] == "espresso.webp"
    assert items[0]["dietaryTags"] == ["vegan", "dairy_free"]
    assert items[0]["allergens"] == ["gluten"]


def test_enable_public_menu_requires_slug(menu_location_id):
    result = asyncio.run(
        schema.execute(
            _MUTATION,
            variable_values={
                "locationId": menu_location_id,
                "publicEnabled": True,
                "publicSlug": None,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors
    assert "publicSlug is required" in result.errors[0].message


def test_enable_public_menu_round_trip(menu_location_id):
    result = asyncio.run(
        schema.execute(
            _MUTATION,
            variable_values={
                "locationId": menu_location_id,
                "publicEnabled": True,
                "publicSlug": "My Cool Cafe",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors is None
    payload = result.data["updateLocationPublicMenu"]
    assert payload["publicEnabled"] is True
    assert payload["publicSlug"] == "my-cool-cafe"
    assert payload["menu"]["publicEnabled"] is True
    assert payload["menu"]["headerImageFilename"] is None

    public = asyncio.run(
        schema.execute(
            _PUBLIC_MENU_QUERY,
            variable_values={"slug": "my-cool-cafe"},
            context_value={},
        )
    )
    assert public.errors is None
    assert public.data["publicLocationMenu"]["name"] == "Menu Pub Loc"
    assert public.data["publicLocationMenu"]["categories"] == []
    assert public.data["publicLocationMenu"]["headerImageFilename"] is None


def test_header_image_filename_set_and_clear(menu_location_id):
    enable = asyncio.run(
        schema.execute(
            _MUTATION,
            variable_values={
                "locationId": menu_location_id,
                "publicEnabled": True,
                "publicSlug": "header-img-cafe",
                "headerImageFilename": "hero.webp",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert enable.errors is None
    assert enable.data["updateLocationPublicMenu"]["menu"]["headerImageFilename"] == "hero.webp"

    public = asyncio.run(
        schema.execute(
            _PUBLIC_MENU_QUERY,
            variable_values={"slug": "header-img-cafe"},
            context_value={},
        )
    )
    assert public.errors is None
    assert public.data["publicLocationMenu"]["headerImageFilename"] == "hero.webp"

    clear = asyncio.run(
        schema.execute(
            _MUTATION,
            variable_values={
                "locationId": menu_location_id,
                "headerImageFilename": None,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert clear.errors is None
    assert clear.data["updateLocationPublicMenu"]["menu"]["headerImageFilename"] is None

    public_cleared = asyncio.run(
        schema.execute(
            _PUBLIC_MENU_QUERY,
            variable_values={"slug": "header-img-cafe"},
            context_value={},
        )
    )
    assert public_cleared.errors is None
    assert public_cleared.data["publicLocationMenu"]["headerImageFilename"] is None


def test_fulfillment_flags_round_trip_on_public_menu(menu_location_id):
    enable = asyncio.run(
        schema.execute(
            _MUTATION,
            variable_values={
                "locationId": menu_location_id,
                "publicEnabled": True,
                "publicSlug": "fulfillment-flags-cafe",
                "allowDineIn": False,
                "allowPickup": True,
                "allowDelivery": True,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert enable.errors is None, enable.errors
    menu = enable.data["updateLocationPublicMenu"]["menu"]
    assert menu["allowDineIn"] is False
    assert menu["allowPickup"] is True
    # Delivery can no longer be enabled on the digital menu.
    assert menu["allowDelivery"] is False

    public = asyncio.run(
        schema.execute(
            _PUBLIC_MENU_QUERY,
            variable_values={"slug": "fulfillment-flags-cafe"},
            context_value={},
        )
    )
    assert public.errors is None
    payload = public.data["publicLocationMenu"]
    assert payload["allowDineIn"] is False
    assert payload["allowPickup"] is True
    assert payload["allowDelivery"] is False


def test_cannot_disable_all_fulfillment_modes(menu_location_id):
    result = asyncio.run(
        schema.execute(
            _MUTATION,
            variable_values={
                "locationId": menu_location_id,
                "publicEnabled": True,
                "publicSlug": "no-modes-cafe",
                "allowDineIn": False,
                "allowPickup": False,
                "allowDelivery": False,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors
    assert "allow_pickup" in result.errors[0].message or "allow_dine_in" in result.errors[0].message

    delivery_only = asyncio.run(
        schema.execute(
            _MUTATION,
            variable_values={
                "locationId": menu_location_id,
                "publicEnabled": True,
                "publicSlug": "delivery-only-cafe",
                "allowDineIn": False,
                "allowPickup": False,
                "allowDelivery": True,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert delivery_only.errors
    assert "allow_pickup" in delivery_only.errors[0].message or "allow_dine_in" in delivery_only.errors[0].message


def test_ordering_enabled_round_trip_on_public_menu(menu_location_id):
    enable = asyncio.run(
        schema.execute(
            _MUTATION,
            variable_values={
                "locationId": menu_location_id,
                "publicEnabled": True,
                "publicSlug": "browse-only-cafe",
                "orderingEnabled": False,
                "allowDineIn": True,
                "allowPickup": True,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert enable.errors is None, enable.errors
    menu = enable.data["updateLocationPublicMenu"]["menu"]
    assert menu["orderingEnabled"] is False
    assert menu["publicEnabled"] is True

    public = asyncio.run(
        schema.execute(
            _PUBLIC_MENU_QUERY,
            variable_values={"slug": "browse-only-cafe"},
            context_value={},
        )
    )
    assert public.errors is None
    payload = public.data["publicLocationMenu"]
    assert payload is not None
    assert payload["orderingEnabled"] is False

    # When ordering is off, both fulfillment modes may be disabled.
    both_off = asyncio.run(
        schema.execute(
            _MUTATION,
            variable_values={
                "locationId": menu_location_id,
                "orderingEnabled": False,
                "allowDineIn": False,
                "allowPickup": False,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert both_off.errors is None, both_off.errors
    assert both_off.data["updateLocationPublicMenu"]["menu"]["allowDineIn"] is False
    assert both_off.data["updateLocationPublicMenu"]["menu"]["allowPickup"] is False

    # Re-enabling ordering without a fulfillment mode must fail.
    reenable = asyncio.run(
        schema.execute(
            _MUTATION,
            variable_values={
                "locationId": menu_location_id,
                "orderingEnabled": True,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert reenable.errors
    assert "allow_pickup" in reenable.errors[0].message or "allow_dine_in" in reenable.errors[0].message
