"""GraphQL type for workspace CRM apps."""

from __future__ import annotations

import uuid
from datetime import datetime

import strawberry


@strawberry.type(
    description=(
        "Workspace-scoped CRM app: loyalty / customer-registration tenant. "
        "Public appId (UUID) is used in enrollment QR and mobile auth claims."
    )
)
class CrmAppType:
    id: int
    app_id: uuid.UUID
    title: str
    workspace_id: int
    created_by_clerk_user_id: str
    created_at: datetime
    updated_at: datetime
