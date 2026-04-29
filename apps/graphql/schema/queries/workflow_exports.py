import strawberry

from graphql.data_sources import SessionLocal, WorkflowExport
from graphql.limits import DEFAULT_LIST_FIRST, MAX_LIST_FIRST, clamp_page_size
from graphql.schema.auth import is_location_owner, user_id_from_info
from graphql.schema.types import WorkflowExportType


def _export_row_to_gql(row: WorkflowExport) -> WorkflowExportType:
    return WorkflowExportType(
        id=str(row.id),
        workflow_id=str(row.workflow_id),
        location_id=row.location_id,
        payload=row.payload,
        schema_version=row.schema_version,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@strawberry.type
class WorkflowExportsQuery:
    @strawberry.field
    def workflow_exports(
        self,
        info: strawberry.Info,
        location_id: int,
        first: int | None = None,
    ) -> list[WorkflowExportType]:
        user_id = user_id_from_info(info)
        if not user_id:
            return []
        limit = clamp_page_size(
            first,
            default=DEFAULT_LIST_FIRST,
            maximum=MAX_LIST_FIRST,
        )

        with SessionLocal() as session:
            if not is_location_owner(session, location_id, user_id):
                return []
            rows = (
                session.query(WorkflowExport)
                .filter(WorkflowExport.location_id == location_id)
                .order_by(WorkflowExport.updated_at.desc())
                .limit(limit)
                .all()
            )
            return [_export_row_to_gql(r) for r in rows]
