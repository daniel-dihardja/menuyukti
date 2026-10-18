"""Guest queries: myFoodProfile, myFoodPreferences, myFoodPreference."""

from __future__ import annotations

import strawberry

import graphql.services.guest_preferences as pref_svc
from graphql.context import request_session_scope
from graphql.schema.auth import user_id_from_info
from graphql.schema.types.food_profile import (
    FoodPreferenceConsentType,
    FoodPreferenceType,
    MyFoodProfileType,
)


def _consent_to_gql(row: pref_svc.ConsentSummaryView) -> FoodPreferenceConsentType:
    return FoodPreferenceConsentType(
        id=row.id,
        purpose=row.purpose,
        allowed_signal_categories=list(row.allowed_signal_categories),
        privacy_notice_version=row.privacy_notice_version,
        consent_version=row.consent_version,
        granted_at=row.granted_at,
        withdrawn_at=row.withdrawn_at,
    )


def _preference_to_gql(row: pref_svc.PreferenceSignalView) -> FoodPreferenceType:
    return FoodPreferenceType(
        id=row.id,
        preference_type=row.preference_type,
        preference_value=row.preference_value,
        source_type=row.source_type,
        source_ref=row.source_ref,
        confidence=row.confidence,
        origin_kind=row.origin_kind,
        explanation=row.explanation,
        origin_location_id=row.origin_location_id,
        origin_location_name=row.origin_location_name,
        portability_enabled=row.portability_enabled,
        recorded_at=row.recorded_at,
        updated_at=row.updated_at,
        expires_at=row.expires_at,
        removed_at=row.removed_at,
        consent_id=row.consent_id,
    )


@strawberry.type
class MyFoodProfileQuery:
    @strawberry.field(
        description=(
            "Food Profile summary for the authenticated Clerk guest "
            "(global switch + active consents). Empty fields when unauthenticated."
        )
    )
    def my_food_profile(self, info: strawberry.Info) -> MyFoodProfileType | None:
        user_id = user_id_from_info(info)
        if not user_id:
            return None
        with request_session_scope(info) as session:
            view = pref_svc.get_guest_preferences(session, clerk_user_id=user_id)
            return MyFoodProfileType(
                profile_id=view.profile_id,
                status=view.profile_status,
                cross_venue_personalization_enabled=view.cross_venue_personalization_enabled,
                active_consents=[_consent_to_gql(c) for c in view.active_consents],
            )

    @strawberry.field(
        description=(
            "List Food Profile preferences for the authenticated guest. "
            "Empty when unauthenticated."
        )
    )
    def my_food_preferences(
        self,
        info: strawberry.Info,
        include_removed: bool = False,
    ) -> list[FoodPreferenceType]:
        user_id = user_id_from_info(info)
        if not user_id:
            return []
        with request_session_scope(info) as session:
            view = pref_svc.get_guest_preferences(
                session,
                clerk_user_id=user_id,
                include_removed=include_removed,
            )
            return [_preference_to_gql(s) for s in view.signals]

    @strawberry.field(
        description="One Food Profile preference by id for the authenticated guest."
    )
    def my_food_preference(
        self,
        info: strawberry.Info,
        id: strawberry.ID,
    ) -> FoodPreferenceType | None:
        user_id = user_id_from_info(info)
        if not user_id:
            return None
        with request_session_scope(info) as session:
            row = pref_svc.get_food_preference(
                session, clerk_user_id=user_id, preference_id=str(id)
            )
            return _preference_to_gql(row) if row is not None else None
