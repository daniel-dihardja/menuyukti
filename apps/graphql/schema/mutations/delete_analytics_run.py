import strawberry

from graphql.data_sources import AnalyticsRun, MenuItemCogs, OrderFact, SessionLocal
from graphql.schema.auth import require_location_owner, user_id_from_info


@strawberry.type
class DeleteAnalyticsRunMutation:
    @strawberry.mutation
    def delete_analytics_run(self, info: strawberry.Info, analytics_run_id: strawberry.ID) -> bool:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for deleteAnalyticsRun")

        try:
            run_pk = int(str(analytics_run_id))
        except ValueError as e:
            raise ValueError("Invalid analytics run id") from e
        if run_pk < 1:
            raise ValueError("Invalid analytics run id")

        with SessionLocal() as session:
            run = session.get(AnalyticsRun, run_pk)
            if run is None:
                raise ValueError("Analytics run not found")

            require_location_owner(session, run.location_id, user_id)

            session.query(MenuItemCogs).where(MenuItemCogs.analytics_run_id == run.id).delete()
            session.query(OrderFact).where(OrderFact.analytics_run_id == run.id).delete()
            session.delete(run)
            session.commit()
            return True
