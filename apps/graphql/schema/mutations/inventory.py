"""Inventory catalog and stock mutations."""

from __future__ import annotations

from datetime import date

import strawberry
from sqlalchemy.exc import IntegrityError
from strawberry import UNSET

from graphql.context import request_session_scope
from graphql.data_sources.models.inventory_catalog_item import InventoryCatalogItem
from graphql.data_sources.models.inventory_stock import InventoryStock
from graphql.schema.auth import (
    is_workspace_member,
    require_location_owner,
    user_id_from_info,
)
from graphql.schema.mappers.inventory import catalog_item_to_gql, stock_to_gql
from graphql.schema.types.inventory_catalog_item import (
    InventoryCatalogItemType,
    InventoryStorageZone,
)
from graphql.schema.types.inventory_stock import (
    InventoryStockTransferResult,
    InventoryStockType,
)
from graphql.services.inventory import (
    DIRECTION_IN,
    DIRECTION_OUT,
    DIRECTION_TRANSFER_IN,
    DIRECTION_TRANSFER_OUT,
    add_movement,
    assert_catalog_matches_location_workspace,
    get_catalog_item_or_raise,
    get_location_or_raise,
    load_stock_with_catalog,
    resolve_occurred_on,
    validate_catalog_fields,
    validate_catalog_on_hand_limits,
    validate_catalog_price,
    validate_movement_quantity,
    validate_on_hand,
    validate_transfer_quantity,
)


@strawberry.type
class InventoryCatalogMutations:
    @strawberry.mutation(description="Add a pantry item to the workspace catalog.")
    def create_inventory_catalog_item(
        self,
        info: strawberry.Info,
        workspace_id: int,
        name: str,
        package_size: float,
        package_unit: str,
        storage_zone: InventoryStorageZone | None = None,
        price: float | None = None,
        min_on_hand: float | None = None,
        max_on_hand: float | None = None,
    ) -> InventoryCatalogItemType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for createInventoryCatalogItem")

        name_clean, size_clean, unit_clean, zone_clean = validate_catalog_fields(
            name=name,
            package_size=package_size,
            package_unit=package_unit,
            storage_zone=storage_zone,
        )
        price_clean = validate_catalog_price(price)
        min_clean, max_clean = validate_catalog_on_hand_limits(min_on_hand, max_on_hand)

        with request_session_scope(info) as session:
            if not is_workspace_member(session, workspace_id, user_id):
                raise PermissionError("Not allowed to manage this workspace catalog")
            row = InventoryCatalogItem(
                workspace_id=workspace_id,
                name=name_clean,
                package_size=size_clean,
                package_unit=unit_clean,
                storage_zone=zone_clean,
                price=price_clean,
                min_on_hand=min_clean,
                max_on_hand=max_clean,
            )
            session.add(row)
            try:
                session.commit()
            except IntegrityError as exc:
                session.rollback()
                raise ValueError("This pantry item already exists in the catalog") from exc
            session.refresh(row)
            return catalog_item_to_gql(row)

    @strawberry.mutation(description="Update a pantry catalog item.")
    def update_inventory_catalog_item(
        self,
        info: strawberry.Info,
        id: int,
        name: str | None = None,
        package_size: float | None = None,
        package_unit: str | None = None,
        storage_zone: InventoryStorageZone | None = None,
        price: float | None = UNSET,
        min_on_hand: float | None = UNSET,
        max_on_hand: float | None = UNSET,
    ) -> InventoryCatalogItemType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for updateInventoryCatalogItem")

        with request_session_scope(info) as session:
            row = get_catalog_item_or_raise(session, id)
            if not is_workspace_member(session, row.workspace_id, user_id):
                raise PermissionError("Not allowed to update this catalog item")

            next_name = row.name if name is None else name
            next_size = row.package_size if package_size is None else package_size
            next_unit = row.package_unit if package_unit is None else package_unit
            next_zone = row.storage_zone if storage_zone is None else storage_zone
            name_clean, size_clean, unit_clean, zone_clean = validate_catalog_fields(
                name=next_name,
                package_size=next_size,
                package_unit=next_unit,
                storage_zone=next_zone,
            )
            row.name = name_clean
            row.package_size = size_clean
            row.package_unit = unit_clean
            row.storage_zone = zone_clean
            if price is not UNSET:
                row.price = validate_catalog_price(price)
            next_min = row.min_on_hand if min_on_hand is UNSET else min_on_hand
            next_max = row.max_on_hand if max_on_hand is UNSET else max_on_hand
            if min_on_hand is not UNSET or max_on_hand is not UNSET:
                min_clean, max_clean = validate_catalog_on_hand_limits(next_min, next_max)
                row.min_on_hand = min_clean
                row.max_on_hand = max_clean
            try:
                session.commit()
            except IntegrityError as exc:
                session.rollback()
                raise ValueError("This pantry item already exists in the catalog") from exc
            session.refresh(row)
            return catalog_item_to_gql(row)

    @strawberry.mutation(description="Delete a pantry catalog item and all location stock rows.")
    def delete_inventory_catalog_item(self, info: strawberry.Info, id: int) -> bool:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for deleteInventoryCatalogItem")

        with request_session_scope(info) as session:
            row = get_catalog_item_or_raise(session, id)
            if not is_workspace_member(session, row.workspace_id, user_id):
                raise PermissionError("Not allowed to delete this catalog item")
            session.delete(row)
            session.commit()
            return True


@strawberry.type
class InventoryStockMutations:
    @strawberry.mutation(description="Set current stock for a catalog item at a location.")
    def upsert_inventory_stock(
        self,
        info: strawberry.Info,
        location_id: int,
        catalog_item_id: int,
        on_hand: float,
    ) -> InventoryStockType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for upsertInventoryStock")

        on_hand_clean = validate_on_hand(on_hand)

        with request_session_scope(info) as session:
            require_location_owner(session, location_id, user_id, info=info)
            location = get_location_or_raise(session, location_id)
            catalog_item = get_catalog_item_or_raise(session, catalog_item_id)
            assert_catalog_matches_location_workspace(session, catalog_item, location)

            row = (
                session.query(InventoryStock)
                .filter(
                    InventoryStock.location_id == location_id,
                    InventoryStock.catalog_item_id == catalog_item_id,
                )
                .first()
            )
            if row is None:
                row = InventoryStock(
                    location_id=location_id,
                    catalog_item_id=catalog_item_id,
                    on_hand=on_hand_clean,
                )
                session.add(row)
            else:
                row.on_hand = on_hand_clean
            session.commit()
            row = load_stock_with_catalog(session, row.id)
            return stock_to_gql(row)

    @strawberry.mutation(
        description="Receive packages at a location (increases stock and records an in movement)."
    )
    def receive_inventory_stock(
        self,
        info: strawberry.Info,
        location_id: int,
        catalog_item_id: int,
        quantity: float,
        occurred_on: date | None = None,
    ) -> InventoryStockType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for receiveInventoryStock")

        qty = validate_movement_quantity(quantity)
        day = resolve_occurred_on(occurred_on)

        with request_session_scope(info) as session:
            require_location_owner(session, location_id, user_id, info=info)
            location = get_location_or_raise(session, location_id)
            catalog_item = get_catalog_item_or_raise(session, catalog_item_id)
            assert_catalog_matches_location_workspace(session, catalog_item, location)

            row = (
                session.query(InventoryStock)
                .filter(
                    InventoryStock.location_id == location_id,
                    InventoryStock.catalog_item_id == catalog_item_id,
                )
                .first()
            )
            if row is None:
                row = InventoryStock(
                    location_id=location_id,
                    catalog_item_id=catalog_item_id,
                    on_hand=qty,
                    last_in_on=day,
                )
                session.add(row)
                session.flush()
            else:
                row.on_hand = row.on_hand + qty
                row.last_in_on = day

            add_movement(
                session,
                location_id=location_id,
                catalog_item_id=catalog_item_id,
                stock_id=row.id,
                direction=DIRECTION_IN,
                quantity=qty,
                occurred_on=day,
            )
            session.commit()
            row = load_stock_with_catalog(session, row.id)
            return stock_to_gql(row)

    @strawberry.mutation(
        description="Use packages from stock (decreases stock and records an out movement)."
    )
    def consume_inventory_stock(
        self,
        info: strawberry.Info,
        stock_id: int,
        quantity: float,
        occurred_on: date | None = None,
    ) -> InventoryStockType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for consumeInventoryStock")

        qty = validate_movement_quantity(quantity)
        day = resolve_occurred_on(occurred_on)

        with request_session_scope(info) as session:
            row = session.get(InventoryStock, stock_id)
            if row is None:
                raise ValueError("Stock row not found")
            require_location_owner(session, row.location_id, user_id, info=info)
            if qty > row.on_hand:
                raise ValueError("quantity cannot exceed current stock")

            row.on_hand = row.on_hand - qty
            row.last_out_on = day
            add_movement(
                session,
                location_id=row.location_id,
                catalog_item_id=row.catalog_item_id,
                stock_id=row.id,
                direction=DIRECTION_OUT,
                quantity=qty,
                occurred_on=day,
            )
            session.commit()
            row = load_stock_with_catalog(session, row.id)
            return stock_to_gql(row)

    @strawberry.mutation(description="Stop tracking a catalog item at a location.")
    def delete_inventory_stock(self, info: strawberry.Info, id: int) -> bool:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for deleteInventoryStock")

        with request_session_scope(info) as session:
            row = session.get(InventoryStock, id)
            if row is None:
                raise ValueError("Stock row not found")
            require_location_owner(session, row.location_id, user_id, info=info)
            session.delete(row)
            session.commit()
            return True

    @strawberry.mutation(
        description="Move packages of a tracked item from one location to another."
    )
    def transfer_inventory_stock(
        self,
        info: strawberry.Info,
        from_stock_id: int,
        to_location_id: int,
        quantity: float,
        occurred_on: date | None = None,
    ) -> InventoryStockTransferResult:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for transferInventoryStock")

        day = resolve_occurred_on(occurred_on)

        with request_session_scope(info) as session:
            source = session.get(InventoryStock, from_stock_id)
            if source is None:
                raise ValueError("Stock row not found")

            require_location_owner(session, source.location_id, user_id, info=info)
            require_location_owner(session, to_location_id, user_id, info=info)

            if source.location_id == to_location_id:
                raise ValueError("Cannot transfer to the same location")

            from_location_id = source.location_id
            catalog_item_id = source.catalog_item_id
            catalog_item = get_catalog_item_or_raise(session, catalog_item_id)
            destination = get_location_or_raise(session, to_location_id)
            assert_catalog_matches_location_workspace(session, catalog_item, destination)

            source_location = get_location_or_raise(session, from_location_id)
            if source_location.workspace_id is None or destination.workspace_id is None:
                raise ValueError("Location is not linked to a workspace")
            if source_location.workspace_id != destination.workspace_id:
                raise ValueError("Locations must belong to the same workspace")

            qty = validate_transfer_quantity(quantity, source.on_hand)
            remaining = source.on_hand - qty

            dest_row = (
                session.query(InventoryStock)
                .filter(
                    InventoryStock.location_id == to_location_id,
                    InventoryStock.catalog_item_id == catalog_item_id,
                )
                .first()
            )
            if dest_row is None:
                dest_row = InventoryStock(
                    location_id=to_location_id,
                    catalog_item_id=catalog_item_id,
                    on_hand=qty,
                    last_in_on=day,
                )
                session.add(dest_row)
                session.flush()
            else:
                dest_row.on_hand = dest_row.on_hand + qty
                dest_row.last_in_on = day

            source.last_out_on = day

            out_movement = add_movement(
                session,
                location_id=from_location_id,
                catalog_item_id=catalog_item_id,
                stock_id=source.id,
                direction=DIRECTION_TRANSFER_OUT,
                quantity=qty,
                occurred_on=day,
            )
            session.flush()

            in_movement = add_movement(
                session,
                location_id=to_location_id,
                catalog_item_id=catalog_item_id,
                stock_id=dest_row.id,
                direction=DIRECTION_TRANSFER_IN,
                quantity=qty,
                occurred_on=day,
                related_movement_id=out_movement.id,
            )
            session.flush()
            out_movement.related_movement_id = in_movement.id

            if remaining <= 0:
                session.delete(source)
                keep_from_stock_id: int | None = None
            else:
                source.on_hand = remaining
                keep_from_stock_id = source.id

            session.commit()

            to_stock = load_stock_with_catalog(session, dest_row.id)
            from_stock_gql = (
                stock_to_gql(load_stock_with_catalog(session, keep_from_stock_id))
                if keep_from_stock_id is not None
                else None
            )

            return InventoryStockTransferResult(
                fromStock=from_stock_gql,
                toStock=stock_to_gql(to_stock),
                fromLocationId=from_location_id,
                toLocationId=to_location_id,
            )

    @strawberry.mutation(
        description="Create a catalog item and initial stock at a location in one step."
    )
    def create_inventory_catalog_item_with_stock(
        self,
        info: strawberry.Info,
        location_id: int,
        name: str,
        package_size: float,
        package_unit: str,
        on_hand: float,
        storage_zone: InventoryStorageZone | None = None,
        price: float | None = None,
        min_on_hand: float | None = None,
        max_on_hand: float | None = None,
    ) -> InventoryStockType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for createInventoryCatalogItemWithStock")

        name_clean, size_clean, unit_clean, zone_clean = validate_catalog_fields(
            name=name,
            package_size=package_size,
            package_unit=package_unit,
            storage_zone=storage_zone,
        )
        price_clean = validate_catalog_price(price)
        min_clean, max_clean = validate_catalog_on_hand_limits(min_on_hand, max_on_hand)
        on_hand_clean = validate_on_hand(on_hand)
        day = resolve_occurred_on(None)

        with request_session_scope(info) as session:
            require_location_owner(session, location_id, user_id, info=info)
            location = get_location_or_raise(session, location_id)
            if location.workspace_id is None:
                raise ValueError("Location is not linked to a workspace")
            if not is_workspace_member(session, location.workspace_id, user_id):
                raise PermissionError("Not allowed to manage this workspace catalog")

            catalog_row = InventoryCatalogItem(
                workspace_id=location.workspace_id,
                name=name_clean,
                package_size=size_clean,
                package_unit=unit_clean,
                storage_zone=zone_clean,
                price=price_clean,
                min_on_hand=min_clean,
                max_on_hand=max_clean,
            )
            session.add(catalog_row)
            try:
                session.flush()
            except IntegrityError as exc:
                session.rollback()
                raise ValueError("This pantry item already exists in the catalog") from exc

            stock_row = InventoryStock(
                location_id=location_id,
                catalog_item_id=catalog_row.id,
                on_hand=on_hand_clean,
                last_in_on=day if on_hand_clean > 0 else None,
            )
            session.add(stock_row)
            try:
                session.flush()
            except IntegrityError as exc:
                session.rollback()
                raise ValueError("This item is already tracked at this location") from exc

            if on_hand_clean > 0:
                add_movement(
                    session,
                    location_id=location_id,
                    catalog_item_id=catalog_row.id,
                    stock_id=stock_row.id,
                    direction=DIRECTION_IN,
                    quantity=on_hand_clean,
                    occurred_on=day,
                )

            try:
                session.commit()
            except IntegrityError as exc:
                session.rollback()
                raise ValueError("This item is already tracked at this location") from exc
            stock_row = load_stock_with_catalog(session, stock_row.id)
            return stock_to_gql(stock_row)
