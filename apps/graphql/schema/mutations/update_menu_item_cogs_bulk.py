import strawberry

from graphql.data_sources import AnalyticsRun, MenuItemCogs, SessionLocal
from graphql.schema.auth import is_location_owner, user_id_from_info
from graphql.schema.types import MenuItemCogsType


@strawberry.input
class MenuItemCogsUpdateInput:
    id: strawberry.ID
    cogs: float


@strawberry.type
class UpdateMenuItemCogsBulkMutation:
    @strawberry.mutation
    def update_menu_item_cogs_bulk(
        self,
        info: strawberry.Info,
        updates: list[MenuItemCogsUpdateInput],
    ) -> list[MenuItemCogsType]:
        user_id = user_id_from_info(info)
        session = SessionLocal()
        try:
            updated_ids: list[int] = []
            for item in updates:
                row = session.get(MenuItemCogs, int(item.id))
                if row is None:
                    continue
                run = session.get(AnalyticsRun, row.analytics_run_id)
                if run is None or not is_location_owner(session, run.location_id, user_id):
                    raise PermissionError("Access denied")
                row.cogs = item.cogs
                updated_ids.append(row.id)
            session.commit()
            result: list[MenuItemCogsType] = []
            for uid in updated_ids:
                row = session.get(MenuItemCogs, uid)
                if row is not None:
                    session.refresh(row)
                    result.append(
                        MenuItemCogsType(
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
                    )
            return result
        finally:
            session.close()
