import strawberry

from graphql.data_sources import LocationProfile, SessionLocal
from graphql.schema.auth import require_location_owner, user_id_from_info


@strawberry.type
class DeleteLocationProfileMutation:
    @strawberry.mutation
    def delete_location_profile(self, info: strawberry.Info, id: strawberry.ID) -> bool:
        user_id = user_id_from_info(info)
        session = SessionLocal()
        try:
            row = session.get(LocationProfile, int(id))
            if row is None:
                return False
            require_location_owner(session, row.location_id, user_id)
            session.delete(row)
            session.commit()
            return True
        finally:
            session.close()
