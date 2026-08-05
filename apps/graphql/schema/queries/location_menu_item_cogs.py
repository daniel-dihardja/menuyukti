import strawberry

from graphql.context import request_session_scope
from graphql.data_sources import LocationMenuItemCogs
from graphql.schema.auth import is_location_owner, user_id_from_info
from graphql.schema.types import LocationMenuItemCogsType
from graphql.services.location_cogs import list_location_cogs


def _location_cogs_to_gql(row: LocationMenuItemCogs) -> LocationMenuItemCogsType:
    return LocationMenuItemCogsType(
        id=row.id,
        locationId=row.location_id,
        menu=row.menu,
        menuCategory=row.menu_category,
        menuCategoryDetail=row.menu_category_detail,
        cogs=row.cogs,
        currency=row.currency,
        createdAt=row.created_at,
        updatedAt=row.updated_at,
    )


@strawberry.type
class LocationMenuItemCogsQuery:
    @strawberry.field(
        description="Location-scoped COGS catalog. Empty when unauthenticated or not an owner."
    )
    def location_menu_item_cogs(
        self,
        info: strawberry.Info,
        location_id: strawberry.ID,
    ) -> list[LocationMenuItemCogsType]:
        user_id = user_id_from_info(info)
        if not user_id:
            return []
        try:
            loc_pk = int(str(location_id))
        except ValueError:
            return []
        if loc_pk < 1:
            return []

        with request_session_scope(info) as session:
            if not is_location_owner(session, loc_pk, user_id):
                return []
            rows = list_location_cogs(session, loc_pk)
            return [_location_cogs_to_gql(row) for row in rows]
