"""Idempotent inventar seed helpers used by make dev-data."""

from __future__ import annotations

from datetime import UTC, datetime

import pytest

from graphql.data_sources import (
    InventoryCatalogItem,
    InventoryStock,
    InventoryStockMovement,
    Location,
    SessionLocal,
    Workspace,
    WorkspaceMembership,
)
from graphql.data_sources.models.menu import (
    Menu,
    MenuCategory,
    MenuItem,
    MenuModifierGroup,
    MenuModifierOption,
)
from graphql.scripts.dev_seed_inventar import reset_inventar, seed_inventar
from graphql.scripts.dev_seed_kaffeestube_menu import KAFFEESTUBE_MENU_CATALOG
from graphql.scripts.dev_seed_mido_menu import MIDO_CATEGORY_ORDER, MIDO_MENU_CATALOG
from graphql.scripts.dev_seed_warung_menu import WARUNG_MENU_CATALOG
from graphql.services.dev_data_seed import (
    DEV_ANALYTICS_LOCATION_NAME,
    DEV_INVENTAR_LOCATION_NAME,
    DEV_MIDO_LOCATION_NAME,
    seed_kaffeestube_menu,
    seed_mido_matcha_menu,
    seed_warung_sunda_menu,
)

SEED_USER = "clerk_dev_seed_inventar_test"


@pytest.fixture
def inventar_seed_workspace():
    session = SessionLocal()
    try:
        # SQLite tests often run without PRAGMA foreign_keys, so deleting a location
        # can leave orphan PosOrder rows. Clear them before creating a new location
        # so autoincrement id reuse cannot reattach stale tickets.
        from graphql.tests.pos_cleanup import delete_all_pos_orders

        delete_all_pos_orders(session)

        now = datetime.now(tz=UTC)
        ws = Workspace(name="Dev Seed Inventar WS", owner_clerk_user_id=SEED_USER)
        session.add(ws)
        session.flush()
        session.add(
            WorkspaceMembership(
                workspace_id=ws.id,
                clerk_user_id=SEED_USER,
                role="owner",
                invited_at=now,
                accepted_at=now,
            )
        )
        inventar = Location(
            name=DEV_INVENTAR_LOCATION_NAME,
            workspace_id=ws.id,
            clerk_user_id=SEED_USER,
            currency="IDR",
        )
        session.add(inventar)
        session.commit()
        session.refresh(ws)
        session.refresh(inventar)
        payload = {
            "workspace_id": ws.id,
            "inventar_id": inventar.id,
        }
    finally:
        session.close()

    yield payload

    session = SessionLocal()
    try:
        from graphql.tests.pos_cleanup import delete_pos_orders

        location_ids = [
            row[0]
            for row in session.query(Location.id)
            .filter(Location.workspace_id == payload["workspace_id"])
            .all()
        ]
        delete_pos_orders(session, location_ids=location_ids)
        menu_ids = [
            row[0]
            for row in session.query(Menu.id).filter(Menu.location_id.in_(location_ids)).all()
        ]
        if menu_ids:
            # SQLite tests often run without PRAGMA foreign_keys, so deleting a
            # location/menu can leave orphan MenuItem rows that reattach on id reuse.
            item_ids = [
                row[0]
                for row in session.query(MenuItem.id).filter(MenuItem.menu_id.in_(menu_ids)).all()
            ]
            if item_ids:
                group_ids = [
                    row[0]
                    for row in session.query(MenuModifierGroup.id)
                    .filter(MenuModifierGroup.menu_item_id.in_(item_ids))
                    .all()
                ]
                if group_ids:
                    session.query(MenuModifierOption).filter(
                        MenuModifierOption.group_id.in_(group_ids)
                    ).delete(synchronize_session=False)
                    session.query(MenuModifierGroup).filter(
                        MenuModifierGroup.id.in_(group_ids)
                    ).delete(synchronize_session=False)
            session.query(MenuItem).filter(MenuItem.menu_id.in_(menu_ids)).delete(
                synchronize_session=False
            )
            session.query(MenuCategory).filter(MenuCategory.menu_id.in_(menu_ids)).delete(
                synchronize_session=False
            )
            session.query(Menu).filter(Menu.id.in_(menu_ids)).delete(synchronize_session=False)
        reset_inventar(session, payload["workspace_id"])
        session.query(Location).filter(Location.workspace_id == payload["workspace_id"]).delete()
        session.query(WorkspaceMembership).filter(
            WorkspaceMembership.workspace_id == payload["workspace_id"]
        ).delete()
        session.query(Workspace).filter(Workspace.id == payload["workspace_id"]).delete()
        session.commit()
    finally:
        session.close()


def test_inventar_seed_is_idempotent(inventar_seed_workspace):
    session = SessionLocal()
    try:
        ws = session.get(Workspace, inventar_seed_workspace["workspace_id"])
        inventar = session.get(Location, inventar_seed_workspace["inventar_id"])
        assert ws is not None and inventar is not None

        reset_inventar(session, ws.id)
        first = seed_inventar(session, ws, inventar, clerk_user_id=SEED_USER)
        session.commit()

        catalog_n = (
            session.query(InventoryCatalogItem)
            .filter(InventoryCatalogItem.workspace_id == inventar_seed_workspace["workspace_id"])
            .count()
        )
        stock_n = (
            session.query(InventoryStock)
            .filter(InventoryStock.location_id == inventar_seed_workspace["inventar_id"])
            .count()
        )
        movement_n = (
            session.query(InventoryStockMovement)
            .filter(InventoryStockMovement.location_id == inventar_seed_workspace["inventar_id"])
            .count()
        )

        assert first["catalog_items"] == 6
        assert first["stock_rows"] == stock_n
        assert first["movements"] == movement_n
        assert catalog_n == 6
        assert stock_n == 6
        # 6 receives + beras 14 + tahu 3 + kangkung 14 + pecel 2 + santan 4 = 43
        assert movement_n == 43

        beras = (
            session.query(InventoryCatalogItem)
            .filter(
                InventoryCatalogItem.workspace_id == inventar_seed_workspace["workspace_id"],
                InventoryCatalogItem.name == "Beras Cianjur",
            )
            .one()
        )
        assert beras.storage_zone == "dry"
        assert beras.category == "dry_goods"

        beras_stock = (
            session.query(InventoryStock)
            .filter(
                InventoryStock.location_id == inventar_seed_workspace["inventar_id"],
                InventoryStock.catalog_item_id == beras.id,
            )
            .one()
        )
        assert beras_stock.on_hand == 4.0
        assert beras_stock.min_on_hand == 2.0
        assert beras_stock.max_on_hand == 10.0
        assert beras_stock.last_updated_by_clerk_user_id == SEED_USER

        beras_outs = (
            session.query(InventoryStockMovement)
            .filter(
                InventoryStockMovement.location_id == inventar_seed_workspace["inventar_id"],
                InventoryStockMovement.catalog_item_id == beras.id,
                InventoryStockMovement.direction == "out",
            )
            .count()
        )
        assert beras_outs == 14
        assert (
            session.query(InventoryStockMovement)
            .filter(
                InventoryStockMovement.location_id == inventar_seed_workspace["inventar_id"],
                InventoryStockMovement.created_by_clerk_user_id == SEED_USER,
            )
            .count()
            == movement_n
        )

        gula = (
            session.query(InventoryCatalogItem)
            .filter(
                InventoryCatalogItem.workspace_id == inventar_seed_workspace["workspace_id"],
                InventoryCatalogItem.name == "Gula Aren",
            )
            .one()
        )
        gula_outs = (
            session.query(InventoryStockMovement)
            .filter(
                InventoryStockMovement.catalog_item_id == gula.id,
                InventoryStockMovement.direction.in_(("out", "transfer_out")),
            )
            .count()
        )
        assert gula_outs == 0

        reset_inventar(session, inventar_seed_workspace["workspace_id"])
        ws = session.get(Workspace, inventar_seed_workspace["workspace_id"])
        inventar = session.get(Location, inventar_seed_workspace["inventar_id"])
        assert ws is not None and inventar is not None
        second = seed_inventar(session, ws, inventar, clerk_user_id=SEED_USER)
        session.commit()

        assert second == first
        assert (
            session.query(InventoryCatalogItem)
            .filter(InventoryCatalogItem.workspace_id == inventar_seed_workspace["workspace_id"])
            .count()
            == catalog_n
        )
        assert (
            session.query(InventoryStock)
            .filter(InventoryStock.location_id == inventar_seed_workspace["inventar_id"])
            .count()
            == stock_n
        )
        assert (
            session.query(InventoryStockMovement)
            .filter(InventoryStockMovement.location_id == inventar_seed_workspace["inventar_id"])
            .count()
            == movement_n
        )
    finally:
        session.close()


def test_warung_sunda_menu_seed(inventar_seed_workspace):
    session = SessionLocal()
    try:
        inventar = session.get(Location, inventar_seed_workspace["inventar_id"])
        assert inventar is not None

        first = seed_warung_sunda_menu(session, inventar)
        session.commit()

        assert first["categories"] == 2
        assert first["items"] == len(WARUNG_MENU_CATALOG)
        assert first["cleared_pos_orders"] == 0

        menu = (
            session.query(Menu)
            .filter(Menu.location_id == inventar_seed_workspace["inventar_id"])
            .one()
        )
        assert menu.title == DEV_INVENTAR_LOCATION_NAME
        categories = (
            session.query(MenuCategory)
            .filter(MenuCategory.menu_id == menu.id)
            .order_by(MenuCategory.sort_order)
            .all()
        )
        assert [c.name for c in categories] == ["Makanan", "Minuman"]
        items = session.query(MenuItem).filter(MenuItem.menu_id == menu.id).all()
        item_names = {row.name for row in items}
        assert item_names == {item.menu for item in WARUNG_MENU_CATALOG}
        by_name = {row.name: row for row in items}
        for catalog_item in WARUNG_MENU_CATALOG:
            row = by_name[catalog_item.menu]
            assert set(row.dietary_tags or []) == set(catalog_item.dietary_tags)
            assert set(row.allergens or []) == set(catalog_item.allergens)
        assert any(row.allergens for row in items)
        assert any("dairy_free" in (row.dietary_tags or []) for row in items)

        # Simulate a POS ticket referencing a menu item — seed must keep fiscal history.
        from graphql.data_sources.models.pos_order import PosOrder, PosOrderLine
        from graphql.services.pos_money import euros_to_cents

        sample_item = items[0]
        cents = euros_to_cents(float(sample_item.price))
        order = PosOrder(
            location_id=inventar.id,
            bill_number="MY-20260918-00001",
            status="paid",
            opened_by_clerk_user_id=SEED_USER,
            payment_method="cash",
            discount_cents=0,
        )
        session.add(order)
        session.flush()
        session.add(
            PosOrderLine(
                pos_order_id=order.id,
                menu_item_id=sample_item.id,
                name_snapshot=sample_item.name,
                menu_category_snapshot="Makanan",
                menu_category_detail_snapshot="Makanan",
                qty=1,
                unit_price_cents=cents,
                tax_class_snapshot="standard",
                tax_rate_bps_snapshot=1900,
                net_cents=0,
                tax_cents=0,
                gross_cents=cents,
                sort_order=0,
            )
        )
        session.commit()
        order_id = order.id

        # Reseed replaces catalog in place; POS tickets stay immutable.
        second = seed_warung_sunda_menu(session, inventar)
        session.commit()
        assert second["categories"] == 2
        assert second["items"] == len(WARUNG_MENU_CATALOG)
        assert second["cleared_pos_orders"] == 0
        assert session.query(MenuItem).filter(MenuItem.menu_id == menu.id).count() == len(
            WARUNG_MENU_CATALOG
        )
        assert session.get(PosOrder, order_id) is not None
        assert session.query(PosOrder).filter(PosOrder.location_id == inventar.id).count() == 1
    finally:
        session.close()


def test_kaffeestube_menu_seed(inventar_seed_workspace):
    session = SessionLocal()
    try:
        analytics = Location(
            name=DEV_ANALYTICS_LOCATION_NAME,
            workspace_id=inventar_seed_workspace["workspace_id"],
            clerk_user_id=SEED_USER,
            currency="EUR",
            city="Berlin",
            country="DE",
        )
        session.add(analytics)
        session.commit()
        session.refresh(analytics)

        first = seed_kaffeestube_menu(session, analytics)
        session.commit()

        assert first["categories"] == 5
        assert first["items"] == len(KAFFEESTUBE_MENU_CATALOG)
        assert first["cleared_pos_orders"] == 0

        menu = session.query(Menu).filter(Menu.location_id == analytics.id).one()
        assert menu.title == DEV_ANALYTICS_LOCATION_NAME
        categories = (
            session.query(MenuCategory)
            .filter(MenuCategory.menu_id == menu.id)
            .order_by(MenuCategory.sort_order)
            .all()
        )
        assert [c.name for c in categories] == [
            "Coffee",
            "Tea",
            "Soft Drinks",
            "Bakery",
            "Food",
        ]
        items = session.query(MenuItem).filter(MenuItem.menu_id == menu.id).all()
        item_names = {row.name for row in items}
        assert item_names == {item.menu for item in KAFFEESTUBE_MENU_CATALOG}
        by_name = {row.name: row for row in items}
        for catalog_item in KAFFEESTUBE_MENU_CATALOG:
            row = by_name[catalog_item.menu]
            assert set(row.dietary_tags or []) == set(catalog_item.dietary_tags)
            assert set(row.allergens or []) == set(catalog_item.allergens)
        assert any("dairy" in (row.allergens or []) for row in items)
        assert any("dairy_free" in (row.dietary_tags or []) for row in items)

        from graphql.data_sources.models.pos_order import PosOrder, PosOrderLine
        from graphql.services.pos_money import euros_to_cents

        sample_item = items[0]
        cents = euros_to_cents(float(sample_item.price))
        order = PosOrder(
            location_id=analytics.id,
            bill_number="KS-20260701-00001",
            status="paid",
            opened_by_clerk_user_id=SEED_USER,
            payment_method="cash",
            discount_cents=0,
        )
        session.add(order)
        session.flush()
        session.add(
            PosOrderLine(
                pos_order_id=order.id,
                menu_item_id=sample_item.id,
                name_snapshot=sample_item.name,
                menu_category_snapshot="Coffee",
                menu_category_detail_snapshot="Espresso",
                qty=1,
                unit_price_cents=cents,
                tax_class_snapshot="standard",
                tax_rate_bps_snapshot=1900,
                net_cents=0,
                tax_cents=0,
                gross_cents=cents,
                sort_order=0,
            )
        )
        session.commit()
        order_id = order.id

        second = seed_kaffeestube_menu(session, analytics)
        session.commit()
        assert second["categories"] == 5
        assert second["items"] == len(KAFFEESTUBE_MENU_CATALOG)
        assert second["cleared_pos_orders"] == 0
        assert session.query(MenuItem).filter(MenuItem.menu_id == menu.id).count() == len(
            KAFFEESTUBE_MENU_CATALOG
        )
        assert session.get(PosOrder, order_id) is not None
        assert session.query(PosOrder).filter(PosOrder.location_id == analytics.id).count() == 1
    finally:
        session.close()


def test_mido_matcha_menu_seed(inventar_seed_workspace):
    session = SessionLocal()
    try:
        mido = Location(
            name=DEV_MIDO_LOCATION_NAME,
            workspace_id=inventar_seed_workspace["workspace_id"],
            clerk_user_id=SEED_USER,
            currency="EUR",
            city="Berlin",
            country="DE",
        )
        session.add(mido)
        session.commit()
        session.refresh(mido)

        first = seed_mido_matcha_menu(session, mido)
        session.commit()

        assert first["categories"] == len(MIDO_CATEGORY_ORDER)
        assert first["items"] == len(MIDO_MENU_CATALOG)
        assert first["cleared_pos_orders"] == 0

        menu = session.query(Menu).filter(Menu.location_id == mido.id).one()
        assert menu.title == DEV_MIDO_LOCATION_NAME
        categories = (
            session.query(MenuCategory)
            .filter(MenuCategory.menu_id == menu.id)
            .order_by(MenuCategory.sort_order)
            .all()
        )
        assert [c.name for c in categories] == list(MIDO_CATEGORY_ORDER)

        items = session.query(MenuItem).filter(MenuItem.menu_id == menu.id).all()
        item_names = {row.name for row in items}
        assert item_names == {item.name for item in MIDO_MENU_CATALOG}
        by_name = {row.name: row for row in items}
        for catalog_item in MIDO_MENU_CATALOG:
            row = by_name[catalog_item.name]
            assert set(row.dietary_tags or []) == set(catalog_item.dietary_tags)
            assert set(row.allergens or []) == set(catalog_item.allergens)
            assert float(row.price) == catalog_item.price

        latte = by_name["Matcha Latte"]
        latte_groups = (
            session.query(MenuModifierGroup)
            .filter(MenuModifierGroup.menu_item_id == latte.id)
            .order_by(MenuModifierGroup.sort_order)
            .all()
        )
        assert [g.name for g in latte_groups] == [
            "Milk Choice",
            "Drink Size",
            "Temperature",
            "Extra Toppings",
        ]
        milk = latte_groups[0]
        assert milk.min_select == 1
        assert milk.max_select == 1
        assert [(o.name, float(o.price_delta)) for o in milk.options] == [
            ("Whole milk", 0.0),
            ("Oat milk", 0.4),
            ("Coconut milk", 0.5),
            ("Almond milk", 0.5),
        ]
        toppings = latte_groups[3]
        assert toppings.min_select == 0
        assert toppings.max_select == 6

        mango = by_name["Mango Matcha"]
        mango_milk = (
            session.query(MenuModifierGroup)
            .filter(
                MenuModifierGroup.menu_item_id == mango.id,
                MenuModifierGroup.name == "Milk Choice",
            )
            .one()
        )
        assert mango_milk.options[0].name == "Coconut milk"
        assert float(mango_milk.options[0].price_delta) == 0.0

        pure = by_name["Pure Matcha"]
        assert (
            session.query(MenuModifierGroup)
            .filter(MenuModifierGroup.menu_item_id == pure.id)
            .count()
            == 0
        )
        combo = by_name["Matcha Break"]
        assert (
            session.query(MenuModifierGroup)
            .filter(MenuModifierGroup.menu_item_id == combo.id)
            .count()
            == 0
        )
        assert float(combo.price) == 8.50

        from graphql.data_sources.models.pos_order import PosOrder, PosOrderLine
        from graphql.services.pos_money import euros_to_cents

        cents = euros_to_cents(float(latte.price))
        order = PosOrder(
            location_id=mido.id,
            bill_number="MIDO-20260701-00001",
            status="paid",
            opened_by_clerk_user_id=SEED_USER,
            payment_method="cash",
            discount_cents=0,
        )
        session.add(order)
        session.flush()
        session.add(
            PosOrderLine(
                pos_order_id=order.id,
                menu_item_id=latte.id,
                name_snapshot=latte.name,
                menu_category_snapshot="Matcha Classics",
                menu_category_detail_snapshot="",
                qty=1,
                unit_price_cents=cents,
                tax_class_snapshot="standard",
                tax_rate_bps_snapshot=1900,
                net_cents=0,
                tax_cents=0,
                gross_cents=cents,
                sort_order=0,
            )
        )
        session.commit()
        order_id = order.id

        second = seed_mido_matcha_menu(session, mido)
        session.commit()
        assert second["categories"] == len(MIDO_CATEGORY_ORDER)
        assert second["items"] == len(MIDO_MENU_CATALOG)
        assert second["cleared_pos_orders"] == 0
        assert session.query(MenuItem).filter(MenuItem.menu_id == menu.id).count() == len(
            MIDO_MENU_CATALOG
        )
        assert session.get(PosOrder, order_id) is not None
        assert session.query(PosOrder).filter(PosOrder.location_id == mido.id).count() == 1
    finally:
        session.close()


def test_clear_inventar_removes_rows_keeps_locations(inventar_seed_workspace):
    from graphql.scripts.load_dev_data import main as load_dev_data_main

    session = SessionLocal()
    try:
        ws = session.get(Workspace, inventar_seed_workspace["workspace_id"])
        inventar = session.get(Location, inventar_seed_workspace["inventar_id"])
        assert ws is not None and inventar is not None

        reset_inventar(session, ws.id)
        seed_inventar(session, ws, inventar, clerk_user_id=SEED_USER)
        session.commit()

        assert (
            session.query(InventoryCatalogItem)
            .filter(InventoryCatalogItem.workspace_id == inventar_seed_workspace["workspace_id"])
            .count()
            == 6
        )
    finally:
        session.close()

    assert (
        load_dev_data_main(
            scope="clear-inventar",
            clerk_user_id=SEED_USER,
            excel_path=None,
            cogs_path=None,
        )
        == 0
    )

    session = SessionLocal()
    try:
        inventar_id = inventar_seed_workspace["inventar_id"]
        assert (
            session.query(InventoryCatalogItem)
            .filter(InventoryCatalogItem.workspace_id == inventar_seed_workspace["workspace_id"])
            .count()
            == 0
        )
        assert (
            session.query(InventoryStock).filter(InventoryStock.location_id == inventar_id).count()
            == 0
        )
        assert (
            session.query(InventoryStockMovement)
            .filter(InventoryStockMovement.location_id == inventar_id)
            .count()
            == 0
        )
        assert session.get(Location, inventar_id) is not None
        assert session.get(Workspace, inventar_seed_workspace["workspace_id"]) is not None
    finally:
        session.close()
