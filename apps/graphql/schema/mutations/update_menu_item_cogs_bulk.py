import strawberry

from graphql.context import request_session_scope
from graphql.data_sources import AnalyticsRun, MenuItemCogs
from graphql.schema.auth import is_location_owner, user_id_from_info
from graphql.schema.types import MenuItemCogsType


@strawberry.input
class MenuItemCogsUpdateInput:
    id: strawberry.ID
    cogs: float


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
class UpdateMenuItemCogsBulkMutation:
    @strawberry.mutation
    def update_menu_item_cogs_bulk(
        self,
        info: strawberry.Info,
        updates: list[MenuItemCogsUpdateInput],
    ) -> list[MenuItemCogsType]:
        user_id = user_id_from_info(info)
        if not updates:
            return []
        id_to_cogs: dict[int, float] = {}
        for item in updates:
            try:
                pk = int(item.id)
            except ValueError:
                continue
            id_to_cogs[pk] = item.cogs
        if not id_to_cogs:
            return []

        with request_session_scope(info) as session:
            rows = session.query(MenuItemCogs).filter(MenuItemCogs.id.in_(id_to_cogs.keys())).all()
            by_id = {r.id: r for r in rows}

            run_ids = {r.analytics_run_id for r in rows}
            for run_id in run_ids:
                run = session.get(AnalyticsRun, run_id)
                if run is None or not is_location_owner(session, run.location_id, user_id):
                    raise PermissionError("Access denied")

            touched: list[MenuItemCogs] = []
            for item in updates:
                try:
                    pk = int(item.id)
                except ValueError:
                    continue
                row = by_id.get(pk)
                if row is None:
                    continue
                row.cogs = id_to_cogs[pk]
                touched.append(row)

            session.commit()
            for row in touched:
                session.refresh(row)
            return [_menu_item_cogs_to_gql(row) for row in touched]
