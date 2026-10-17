"""GraphQL types for guest Food Profile (guest-self only)."""

from __future__ import annotations

from datetime import datetime

import strawberry


@strawberry.type(description="Active consent summary for the guest Food Profile.")
class FoodPreferenceConsentType:
    id: str
    purpose: str
    allowed_signal_categories: list[str]
    privacy_notice_version: str
    consent_version: str
    granted_at: datetime
    withdrawn_at: datetime | None


@strawberry.type(description="One Food Profile preference (guest-self).")
class FoodPreferenceType:
    id: str
    preference_type: str
    preference_value: str
    source_type: str
    source_ref: str
    confidence: float
    origin_kind: str
    explanation: str | None
    origin_location_id: int | None
    origin_location_name: str | None
    portability_enabled: bool
    recorded_at: datetime
    updated_at: datetime
    expires_at: datetime | None
    removed_at: datetime | None
    consent_id: str


@strawberry.type(description="Guest Food Profile summary.")
class MyFoodProfileType:
    profile_id: str | None
    status: str | None
    cross_venue_personalization_enabled: bool
    active_consents: list[FoodPreferenceConsentType]


@strawberry.type(description="DSAR-style Food Profile export payload.")
class FoodProfileExportType:
    payload_json: str


@strawberry.type(description="Result of deleting the guest Food Profile.")
class DeleteFoodProfileResultType:
    deleted: bool
