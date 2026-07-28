"""GraphQL type for a newly minted CRM enrollment token (raw secret once)."""

from __future__ import annotations

from datetime import datetime

import strawberry


@strawberry.type(
    description=(
        "Staff-minted enrollment token. The raw token is returned only once; "
        "the server stores a hash."
    )
)
class CrmEnrollmentTokenCreatedType:
    token: str
    expires_at: datetime
    enroll_url: str
