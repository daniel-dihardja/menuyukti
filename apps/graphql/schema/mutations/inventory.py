"""Inventory catalog and stock mutations."""

from __future__ import annotations

import strawberry
from sqlalchemy.exc import IntegrityError

from graphql.context import request_session_scope
from graphql.data_sources.models.inventory_catalog_item import InventoryCatalogItem
from graphql.data_sources.models.inventory_stock import InventoryStock
from graphql.schema.auth import (
    is_workspace_member,
    require_location_owner,
    user_id_from_info,
)
from graphql.schema.mappers.inventory import catalog_item_to_gql, stock_to_gql
from graphql.schema.types.inventory_catalog_item import InventoryCatalogItemType
from graphql.schema.types.inventory_stock import InventoryStockType
from graphql.services.inventory import (
    assert_catalog_matches_location_workspace,
    get_catalog_item_or_raise,
    get_location_or_raise,
    load_stock_with_catalog,
    validate_catalog_fields,
    validate_on_hand,
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
    ) -> InventoryCatalogItemType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for createInventoryCatalogItem")

        name_clean, size_clean, unit_clean = validate_catalog_fields(
            name=name,
            package_size=package_size,
            package_unit=package_unit,
        )

        with request_session_scope(info) as session:
            if not is_workspace_member(session, workspace_id, user_id):
                raise PermissionError("Not allowed to manage this workspace catalog")
            row = InventoryCatalogItem(
                workspace_id=workspace_id,
                name=name_clean,
                package_size=size_clean,
                package_unit=unit_clean,
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
            name_clean, size_clean, unit_clean = validate_catalog_fields(
                name=next_name,
                package_size=next_size,
                package_unit=next_unit,
            )
            row.name = name_clean
            row.package_size = size_clean
            row.package_unit = unit_clean
            try:
                session.commit()
            except IntegrityError as exc:
                session.rollback()
                raise ValueError("This pantry item already exists in the catalog") from exc
            session.refresh(row)
            return catalog_item_to_gql(row)

    @strawberry.mutation(
        description="Delete a pantry catalog item and all location stock rows."
    )
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
    ) -> InventoryStockType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for createInventoryCatalogItemWithStock")

        name_clean, size_clean, unit_clean = validate_catalog_fields(
            name=name,
            package_size=package_size,
            package_unit=package_unit,
        )
        on_hand_clean = validate_on_hand(on_hand)

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
            )
            session.add(stock_row)
            try:
                session.commit()
            except IntegrityError as exc:
                session.rollback()
                raise ValueError("This item is already tracked at this location") from exc
            stock_row = load_stock_with_catalog(session, stock_row.id)
            return stock_to_gql(stock_row)
