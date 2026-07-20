"""GraphQL type for workspace visual style packs."""

from __future__ import annotations

import strawberry
from strawberry.scalars import JSON


@strawberry.type(
    description=(
        "Workspace-scoped visual style pack: Style Spec v2 JSON plus one media-library "
        "reference image used when generating Instagram posts."
    )
)
class StyleType:
    id: int
    workspace_id: int
    created_by_clerk_user_id: str
    name: str
    rules: str
    reference_image_name: str
    is_default: bool
    spec: JSON
