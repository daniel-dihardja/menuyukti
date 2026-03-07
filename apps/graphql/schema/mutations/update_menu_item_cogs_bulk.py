import strawberry

from graphql.data_sources import MenuItemCogs, SessionLocal
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
        updates: list[MenuItemCogsUpdateInput],
    ) -> list[MenuItemCogsType]:
        session = SessionLocal()
        try:
            updated_ids: list[int] = []
            for item in updates:
                row = session.get(MenuItemCogs, int(item.id))
                if row is None:
                    continue
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
