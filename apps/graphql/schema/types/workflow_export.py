from datetime import datetime

import strawberry
from strawberry.scalars import JSON


@strawberry.type
class WorkflowExportType:
    id: strawberry.ID
    workflow_id: strawberry.ID
    location_id: int
    payload: JSON
    schema_version: str
    created_at: datetime | None
    updated_at: datetime | None
