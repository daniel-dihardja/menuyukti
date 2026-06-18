import strawberry

from graphql.context import request_session_scope
from graphql.data_sources import AnalyticsRun, MenuItemCogs
from graphql.schema.auth import require_location_owner, user_id_from_info
from graphql.schema.types import MenuItemCogsType


@strawberry.input
class MenuItemCogsUpsertInput:
    menuName: str
    cogs: float
    menuCategory: str | None = None
    menuCategoryDetail: str | None = None
    currency: str | None = None


def _menu_item_cogs_to_gql(row: MenuItemCogs) -> MenuItemCogsType:
    return MenuItemCogsType(
        id=row.id,
        analyticsRunId=row.analytics_run_id,
        menu=row.menu,
        menuCategory=row.menu_category,
        menuCategoryDetail=row.menu_category_detail,
        cogs=row.cogs,
        currency=row.currency,
        createdAt=row.created_at,
        updatedAt=row.updated_at,
    )


@strawberry.type
class UpsertMenuItemCogsBulkMutation:
    @strawberry.mutation
    def upsert_menu_item_cogs_bulk(
        self,
        info: strawberry.Info,
        analytics_run_id: strawberry.ID,
        items: list[MenuItemCogsUpsertInput],
    ) -> list[MenuItemCogsType]:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for upsertMenuItemCogsBulk")
        if not items:
            return []

        try:
            run_pk = int(str(analytics_run_id))
        except ValueError as e:
            raise ValueError("Invalid analytics run id") from e
        if run_pk < 1:
            raise ValueError("Invalid analytics run id")

        with request_session_scope(info) as session:
            run = session.get(AnalyticsRun, run_pk)
            if run is None:
                raise ValueError("Analytics run not found")
            require_location_owner(session, run.location_id, user_id)

            existing = (
                session.query(MenuItemCogs).where(MenuItemCogs.analytics_run_id == run_pk).all()
            )
            by_menu = {row.menu: row for row in existing}

            touched: list[MenuItemCogs] = []
            for item in items:
                menu_name = item.menuName.strip()
                if not menu_name:
                    continue
                row = by_menu.get(menu_name)
                if row is None:
                    row = MenuItemCogs(
                        analytics_run_id=run_pk,
                        menu=menu_name,
                        menu_category=item.menuCategory,
                        menu_category_detail=item.menuCategoryDetail,
                        cogs=item.cogs,
                        currency=item.currency or "IDR",
                    )
                    session.add(row)
                    by_menu[menu_name] = row
                else:
                    row.cogs = item.cogs
                    if item.menuCategory is not None:
                        row.menu_category = item.menuCategory
                    if item.menuCategoryDetail is not None:
                        row.menu_category_detail = item.menuCategoryDetail
                    if item.currency is not None:
                        row.currency = item.currency
                touched.append(row)

            session.commit()
            for row in touched:
                session.refresh(row)
            return [_menu_item_cogs_to_gql(row) for row in touched]
