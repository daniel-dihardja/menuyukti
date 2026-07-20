"""GraphQL type for workspace visual style packs."""

from __future__ import annotations

import strawberry
from strawberry.scalars import JSON


@strawberry.type(
    description=(
        "Workspace-scoped visual style pack: textual rules plus one media-library "
        "reference image used when generating Instagram posts. Optional styleSpec "
        "holds the structured Style Spec v2 used for compiled prompts."
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
    style_spec: JSON | None = None
