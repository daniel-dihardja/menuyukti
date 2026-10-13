"""Guest mutations for Food Profile (authenticated Clerk self only)."""

from __future__ import annotations

import json

import strawberry

import graphql.services.guest_preferences as pref_svc
from graphql.context import request_session_scope
from graphql.schema.auth import user_id_from_info
from graphql.schema.queries.my_food_profile import _consent_to_gql, _preference_to_gql
from graphql.schema.types.food_profile import (
    DeleteFoodProfileResultType,
    FoodPreferenceType,
    FoodProfileExportType,
    MyFoodProfileType,
)


def _require_user(info: strawberry.Info, *, mutation_name: str) -> str:
    user_id = user_id_from_info(info)
    if not user_id:
        raise ValueError(f"Missing authenticated user for {mutation_name}")
    return user_id


def _profile_to_gql(session, user_id: str) -> MyFoodProfileType:
    view = pref_svc.get_guest_preferences(session, clerk_user_id=user_id)
    return MyFoodProfileType(
        profile_id=view.profile_id,
        status=view.profile_status,
        cross_venue_personalization_enabled=view.cross_venue_personalization_enabled,
        active_consents=[_consent_to_gql(c) for c in view.active_consents],
    )


@strawberry.type
class FoodProfileMutations:
    @strawberry.mutation(description="Add an explicit Food Profile preference.")
    def add_explicit_food_preference(
        self,
        info: strawberry.Info,
        preference_type: str,
        preference_value: str,
        explanation: str | None = None,
    ) -> FoodPreferenceType:
        user_id = _require_user(info, mutation_name="addExplicitFoodPreference")
        with request_session_scope(info) as session:
            row = pref_svc.add_explicit_food_preference(
                session,
                clerk_user_id=user_id,
                preference_type=preference_type,
                preference_value=preference_value,
                explanation=explanation,
            )
            session.commit()
            view = pref_svc.get_food_preference(
                session, clerk_user_id=user_id, preference_id=str(row.id)
            )
            assert view is not None
            return _preference_to_gql(view)

    @strawberry.mutation(description="Correct a Food Profile preference value.")
    def update_food_preference(
        self,
        info: strawberry.Info,
        id: strawberry.ID,
        preference_value: str,
    ) -> FoodPreferenceType:
        user_id = _require_user(info, mutation_name="updateFoodPreference")
        with request_session_scope(info) as session:
            row = pref_svc.update_food_preference(
                session,
                clerk_user_id=user_id,
                preference_id=str(id),
                preference_value=preference_value,
            )
            session.commit()
            view = pref_svc.get_food_preference(
                session, clerk_user_id=user_id, preference_id=str(row.id)
            )
            assert view is not None
            return _preference_to_gql(view)

    @strawberry.mutation(description="Soft-delete a Food Profile preference.")
    def remove_food_preference(
        self,
        info: strawberry.Info,
        id: strawberry.ID,
    ) -> FoodPreferenceType:
        user_id = _require_user(info, mutation_name="removeFoodPreference")
        with request_session_scope(info) as session:
            row = pref_svc.remove_food_preference(
                session, clerk_user_id=user_id, preference_id=str(id)
            )
            session.commit()
            view = pref_svc.get_food_preference(
                session, clerk_user_id=user_id, preference_id=str(row.id)
            )
            assert view is not None
            return _preference_to_gql(view)

    @strawberry.mutation(
        description="Enable or disable cross-venue portability for one preference."
    )
    def set_food_preference_portability(
        self,
        info: strawberry.Info,
        id: strawberry.ID,
        enabled: bool,
    ) -> FoodPreferenceType:
        user_id = _require_user(info, mutation_name="setFoodPreferencePortability")
        with request_session_scope(info) as session:
            row = pref_svc.set_food_preference_portability(
                session,
                clerk_user_id=user_id,
                preference_id=str(id),
                enabled=enabled,
            )
            session.commit()
            view = pref_svc.get_food_preference(
                session, clerk_user_id=user_id, preference_id=str(row.id)
            )
            assert view is not None
            return _preference_to_gql(view)

    @strawberry.mutation(
        description=(
            "Enable or disable cross-venue personalization globally. "
            "Enabling requires a new cross_venue_personalization consent "
            "(notice/version/method)."
        )
    )
    def set_cross_venue_personalization(
        self,
        info: strawberry.Info,
        enabled: bool,
        privacy_notice_version: str | None = None,
        consent_version: str | None = None,
        collection_method: str | None = None,
        evidence_reference: str | None = None,
        allowed_signal_categories: list[str] | None = None,
    ) -> MyFoodProfileType:
        user_id = _require_user(info, mutation_name="setCrossVenuePersonalization")
        with request_session_scope(info) as session:
            pref_svc.set_cross_venue_personalization(
                session,
                clerk_user_id=user_id,
                enabled=enabled,
                privacy_notice_version=privacy_notice_version,
                consent_version=consent_version,
                collection_method=collection_method,
                evidence_reference=evidence_reference,
                allowed_signal_categories=allowed_signal_categories,
            )
            session.commit()
            return _profile_to_gql(session, user_id)

    @strawberry.mutation(description="Grant Food Profile consent for a purpose.")
    def grant_food_preference_consent(
        self,
        info: strawberry.Info,
        purpose: str,
        allowed_signal_categories: list[str],
        privacy_notice_version: str,
        consent_version: str,
        collection_method: str,
        evidence_reference: str | None = None,
    ) -> MyFoodProfileType:
        user_id = _require_user(info, mutation_name="grantFoodPreferenceConsent")
        with request_session_scope(info) as session:
            pref_svc.grant_preference_consent(
                session,
                clerk_user_id=user_id,
                purpose=purpose,
                allowed_signal_categories=allowed_signal_categories,
                privacy_notice_version=privacy_notice_version,
                consent_version=consent_version,
                collection_method=collection_method,
                evidence_reference=evidence_reference,
            )
            session.commit()
            return _profile_to_gql(session, user_id)

    @strawberry.mutation(description="Withdraw Food Profile consent for a purpose.")
    def withdraw_food_preference_consent(
        self,
        info: strawberry.Info,
        purpose: str,
    ) -> MyFoodProfileType:
        user_id = _require_user(info, mutation_name="withdrawFoodPreferenceConsent")
        with request_session_scope(info) as session:
            pref_svc.withdraw_preference_consent(
                session, clerk_user_id=user_id, purpose=purpose
            )
            session.commit()
            return _profile_to_gql(session, user_id)

    @strawberry.mutation(description="Export Food Profile JSON for the authenticated guest.")
    def export_my_food_profile(self, info: strawberry.Info) -> FoodProfileExportType:
        user_id = _require_user(info, mutation_name="exportMyFoodProfile")
        with request_session_scope(info) as session:
            payload = pref_svc.export_guest_food_profile(
                session, clerk_user_id=user_id
            )
            return FoodProfileExportType(payload_json=json.dumps(payload, default=str))

    @strawberry.mutation(
        description="Delete Food Profile and preferences; retain consent evidence."
    )
    def delete_my_food_profile(self, info: strawberry.Info) -> DeleteFoodProfileResultType:
        user_id = _require_user(info, mutation_name="deleteMyFoodProfile")
        with request_session_scope(info) as session:
            deleted = pref_svc.delete_guest_preference_profile(
                session, clerk_user_id=user_id
            )
            session.commit()
            return DeleteFoodProfileResultType(deleted=deleted)
