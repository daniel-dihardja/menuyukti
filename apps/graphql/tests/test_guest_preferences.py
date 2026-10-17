"""Guest Preference Network + Food Profile portability: consent, isolation, retention."""

from __future__ import annotations

import ast
import asyncio
from pathlib import Path

import pytest
from sqlalchemy import func, select

from graphql.data_sources import SessionLocal
from graphql.data_sources.models.guest_preference import (
    GuestPreferenceConsent,
    GuestPreferenceProfile,
    GuestPreferenceSignal,
)
from graphql.domain.guest_preference_catalog import (
    ENV_FEATURE_FLAG,
    PURPOSE_CROSS_VENUE_PERSONALIZATION,
    PURPOSE_PREFERENCE_COLLECTION,
    SIGNAL_CATEGORY_EXPLICIT,
    SIGNAL_CATEGORY_VOTING,
    SOURCE_TYPE_PREDICTION_VOTE,
    SOURCE_TYPE_VOTING_VOTE,
)
from graphql.schema import schema
from graphql.services import guest_preferences as pref_svc
from graphql.services.guest_preferences import PreferenceSignalEvent

GUEST_A = "clerk_guest_pref_a"
GUEST_B = "clerk_guest_pref_b"


def _auth(clerk_user_id: str) -> dict[str, str]:
    return {"user_id": clerk_user_id}


@pytest.fixture
def preference_network_enabled(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv(ENV_FEATURE_FLAG, "true")
    yield
    monkeypatch.delenv(ENV_FEATURE_FLAG, raising=False)


@pytest.fixture
def clean_preference_rows():
    session = SessionLocal()
    try:
        for model in (
            GuestPreferenceSignal,
            GuestPreferenceConsent,
            GuestPreferenceProfile,
        ):
            for row in session.scalars(select(model)).all():
                session.delete(row)
        session.commit()
    finally:
        session.close()
    yield
    session = SessionLocal()
    try:
        for model in (
            GuestPreferenceSignal,
            GuestPreferenceConsent,
            GuestPreferenceProfile,
        ):
            for row in session.scalars(select(model)).all():
                session.delete(row)
        session.commit()
    finally:
        session.close()


def _grant_collection_consent(
    session, *, clerk_user_id: str = GUEST_A, categories: list[str] | None = None
) -> GuestPreferenceConsent:
    return pref_svc.grant_preference_consent(
        session,
        clerk_user_id=clerk_user_id,
        purpose=PURPOSE_PREFERENCE_COLLECTION,
        allowed_signal_categories=categories
        or [SIGNAL_CATEGORY_VOTING, SIGNAL_CATEGORY_EXPLICIT],
        privacy_notice_version="pn-1.0",
        consent_version="cv-1.0",
        collection_method="test_fixture",
        evidence_reference="test:grant",
    )


def _grant_cross_venue_consent(
    session, *, clerk_user_id: str = GUEST_A
) -> GuestPreferenceConsent:
    return pref_svc.grant_preference_consent(
        session,
        clerk_user_id=clerk_user_id,
        purpose=PURPOSE_CROSS_VENUE_PERSONALIZATION,
        allowed_signal_categories=[SIGNAL_CATEGORY_EXPLICIT, SIGNAL_CATEGORY_VOTING],
        privacy_notice_version="pn-1.0",
        consent_version="cv-port-1.0",
        collection_method="test_fixture",
        evidence_reference="test:cross_venue",
    )


def _voting_event(
    *,
    clerk_user_id: str = GUEST_A,
    source_ref: str = "voting_vote:1",
    preference_value: str = "italian",
) -> PreferenceSignalEvent:
    return PreferenceSignalEvent(
        clerk_user_id=clerk_user_id,
        source_type=SOURCE_TYPE_VOTING_VOTE,
        source_ref=source_ref,
        preference_type="cuisine",
        preference_value=preference_value,
        confidence=0.8,
        explanation="Based on a poll choice you made",
        origin_location_id=None,
    )


def test_feature_flag_defaults_off(clean_preference_rows, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.delenv(ENV_FEATURE_FLAG, raising=False)
    assert pref_svc.is_guest_preference_network_enabled() is False

    session = SessionLocal()
    try:
        _grant_collection_consent(session)
        session.commit()
        result = pref_svc.record_eligible_preference_signal(
            session, event=_voting_event()
        )
        session.commit()
        assert result is None
        count = session.scalar(select(func.count()).select_from(GuestPreferenceSignal))
        assert int(count or 0) == 0
    finally:
        session.close()


def test_no_opt_in_no_signal(preference_network_enabled, clean_preference_rows):
    session = SessionLocal()
    try:
        result = pref_svc.record_eligible_preference_signal(
            session, event=_voting_event()
        )
        session.commit()
        assert result is None
        count = session.scalar(select(func.count()).select_from(GuestPreferenceSignal))
        assert int(count or 0) == 0
    finally:
        session.close()


def test_opt_in_eligible_voting_creates_signal(
    preference_network_enabled, clean_preference_rows
):
    session = SessionLocal()
    try:
        _grant_collection_consent(session)
        session.commit()
        signal = pref_svc.record_eligible_preference_signal(
            session, event=_voting_event()
        )
        session.commit()
        assert signal is not None
        assert signal.preference_type == "cuisine"
        assert signal.preference_value == "italian"
        assert signal.portability_enabled is False
        assert signal.origin_kind == "inferred"

        view = pref_svc.get_guest_preferences(session, clerk_user_id=GUEST_A)
        assert view.profile_id is not None
        assert view.cross_venue_personalization_enabled is False
        assert len(view.signals) == 1
    finally:
        session.close()


def test_pick_and_win_not_food_preference(
    preference_network_enabled, clean_preference_rows
):
    session = SessionLocal()
    try:
        _grant_collection_consent(session)
        session.commit()

        event = PreferenceSignalEvent(
            clerk_user_id=GUEST_A,
            source_type=SOURCE_TYPE_PREDICTION_VOTE,
            source_ref="prediction_vote:99",
            preference_type="cuisine",
            preference_value="italian",
            confidence=1.0,
        )
        eligibility = pref_svc.evaluate_preference_eligibility(GUEST_A, event)
        assert eligibility.eligible is False
        assert "pick_and_win" in eligibility.reason

        result = pref_svc.record_eligible_preference_signal(session, event=event)
        session.commit()
        assert result is None
    finally:
        session.close()


def test_duplicate_voting_event_idempotent(
    preference_network_enabled, clean_preference_rows
):
    session = SessionLocal()
    try:
        _grant_collection_consent(session)
        session.commit()
        first = pref_svc.record_eligible_preference_signal(
            session, event=_voting_event(source_ref="voting_vote:42")
        )
        session.commit()
        second = pref_svc.record_eligible_preference_signal(
            session, event=_voting_event(source_ref="voting_vote:42")
        )
        session.commit()
        assert first is not None and second is not None
        assert first.id == second.id
        count = session.scalar(select(func.count()).select_from(GuestPreferenceSignal))
        assert int(count or 0) == 1
    finally:
        session.close()


def test_preference_service_does_not_expose_restaurant_customers(
    preference_network_enabled, clean_preference_rows
):
    session = SessionLocal()
    try:
        _grant_collection_consent(session, clerk_user_id=GUEST_A)
        _grant_collection_consent(session, clerk_user_id=GUEST_B)
        session.commit()
        pref_svc.record_eligible_preference_signal(
            session, event=_voting_event(clerk_user_id=GUEST_A, preference_value="thai")
        )
        pref_svc.record_eligible_preference_signal(
            session,
            event=_voting_event(
                clerk_user_id=GUEST_B,
                source_ref="voting_vote:2",
                preference_value="japanese",
            ),
        )
        session.commit()

        view_a = pref_svc.get_guest_preferences(session, clerk_user_id=GUEST_A)
        view_b = pref_svc.get_guest_preferences(session, clerk_user_id=GUEST_B)
        assert [s.preference_value for s in view_a.signals] == ["thai"]
        assert [s.preference_value for s in view_b.signals] == ["japanese"]
        assert "location_id" not in pref_svc.get_guest_preferences.__code__.co_varnames
    finally:
        session.close()


def test_no_preference_fields_on_location_menu_schema():
    from graphql.schema.types import location as location_types
    from graphql.schema.types import menu as menu_types
    from graphql.schema.types import public_location_menu as public_menu_types

    for module in (location_types, menu_types, public_menu_types):
        source = Path(module.__file__).read_text(encoding="utf-8")
        assert "guest_preference" not in source.lower()
        assert "GuestPreference" not in source
        assert "FoodProfile" not in source
        assert "myFoodProfile" not in source


def test_withdraw_collection_stops_new_inferred(
    preference_network_enabled, clean_preference_rows
):
    session = SessionLocal()
    try:
        _grant_collection_consent(session)
        session.commit()
        first = pref_svc.record_eligible_preference_signal(
            session, event=_voting_event(source_ref="voting_vote:10")
        )
        session.commit()
        assert first is not None

        withdrawn = pref_svc.withdraw_preference_consent(
            session, clerk_user_id=GUEST_A, purpose=PURPOSE_PREFERENCE_COLLECTION
        )
        session.commit()
        assert withdrawn is not None

        second = pref_svc.record_eligible_preference_signal(
            session, event=_voting_event(source_ref="voting_vote:11")
        )
        session.commit()
        assert second is None
    finally:
        session.close()


def test_delete_profile_retains_consent_evidence(
    preference_network_enabled, clean_preference_rows
):
    session = SessionLocal()
    try:
        _grant_collection_consent(session)
        session.commit()
        pref_svc.record_eligible_preference_signal(session, event=_voting_event())
        session.commit()

        deleted = pref_svc.delete_guest_preference_profile(
            session, clerk_user_id=GUEST_A
        )
        session.commit()
        assert deleted is True

        profile = session.scalar(
            select(GuestPreferenceProfile).where(
                GuestPreferenceProfile.clerk_user_id == GUEST_A
            )
        )
        assert profile is None
        signal_count = session.scalar(
            select(func.count())
            .select_from(GuestPreferenceSignal)
            .where(GuestPreferenceSignal.clerk_user_id == GUEST_A)
        )
        assert int(signal_count or 0) == 0

        consents = session.scalars(
            select(GuestPreferenceConsent).where(
                GuestPreferenceConsent.clerk_user_id == GUEST_A
            )
        ).all()
        assert len(consents) >= 1
        assert all(c.withdrawn_at is not None for c in consents)
    finally:
        session.close()


def test_rejects_anonymous_and_empty_identity(
    preference_network_enabled, clean_preference_rows
):
    session = SessionLocal()
    try:
        with pytest.raises(ValueError, match="clerk_user_id"):
            pref_svc.grant_preference_consent(
                session,
                clerk_user_id="",
                purpose=PURPOSE_PREFERENCE_COLLECTION,
                allowed_signal_categories=[SIGNAL_CATEGORY_VOTING],
                privacy_notice_version="pn-1.0",
                consent_version="cv-1.0",
                collection_method="test",
            )
        with pytest.raises(ValueError, match="clerk_user_id"):
            pref_svc.get_guest_preferences(session, clerk_user_id="   ")
    finally:
        session.close()


def test_existing_modules_do_not_import_guest_preferences():
    graphql_root = Path(__file__).resolve().parents[1]
    producer_paths = [
        graphql_root / "services" / "votings.py",
        graphql_root / "services" / "predictions.py",
        graphql_root / "services" / "point_ledger.py",
        graphql_root / "services" / "pos_order_close.py",
        graphql_root / "schema" / "mutations" / "vote_voting.py",
        graphql_root / "schema" / "mutations" / "vote_prediction.py",
        graphql_root / "schema" / "mutations" / "submit_public_menu_order.py",
    ]
    for path in producer_paths:
        assert path.is_file(), f"missing expected producer: {path}"
        tree = ast.parse(path.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if isinstance(node, ast.ImportFrom) and node.module:
                assert "guest_preferences" not in node.module
                assert "guest_preference" not in node.module
            if isinstance(node, ast.Import):
                for alias in node.names:
                    assert "guest_preference" not in alias.name


def test_portability_disabled_excluded_from_match(
    preference_network_enabled, clean_preference_rows
):
    """Scenario 1: preference exists but portability off — not used cross-venue."""
    session = SessionLocal()
    try:
        _grant_collection_consent(session)
        _grant_cross_venue_consent(session)
        session.commit()
        signal = pref_svc.record_eligible_preference_signal(
            session, event=_voting_event()
        )
        session.commit()
        assert signal is not None
        assert signal.portability_enabled is False

        match = pref_svc.match_guest_preferences_to_menu(
            session, clerk_user_id=GUEST_A, restaurant_id=99
        )
        assert match.eligible_preference_values == []
        assert match.reason == "no_portable_preferences"
        assert match.matched_menu_item_ids == []
    finally:
        session.close()


def test_enable_one_preference_portability(
    preference_network_enabled, clean_preference_rows
):
    """Scenario 2: only the portable preference becomes cross-venue eligible."""
    session = SessionLocal()
    try:
        _grant_collection_consent(session)
        _grant_cross_venue_consent(session)
        session.commit()
        a = pref_svc.record_eligible_preference_signal(
            session, event=_voting_event(source_ref="voting_vote:a", preference_value="thai")
        )
        b = pref_svc.record_eligible_preference_signal(
            session,
            event=_voting_event(source_ref="voting_vote:b", preference_value="japanese"),
        )
        session.commit()
        pref_svc.set_food_preference_portability(
            session, clerk_user_id=GUEST_A, preference_id=str(a.id), enabled=True
        )
        session.commit()

        eligible, reason = pref_svc.list_cross_venue_eligible_preferences(
            session, clerk_user_id=GUEST_A
        )
        assert reason == "ok"
        assert [e.preference_value for e in eligible] == ["thai"]
        assert str(b.id) not in {str(e.id) for e in eligible}
    finally:
        session.close()


def test_disable_portability_excludes_again(
    preference_network_enabled, clean_preference_rows
):
    """Scenario 3: disabling portability excludes preference from match."""
    session = SessionLocal()
    try:
        _grant_collection_consent(session)
        _grant_cross_venue_consent(session)
        session.commit()
        signal = pref_svc.record_eligible_preference_signal(
            session, event=_voting_event()
        )
        session.commit()
        pref_svc.set_food_preference_portability(
            session, clerk_user_id=GUEST_A, preference_id=str(signal.id), enabled=True
        )
        session.commit()
        pref_svc.set_food_preference_portability(
            session, clerk_user_id=GUEST_A, preference_id=str(signal.id), enabled=False
        )
        session.commit()

        match = pref_svc.match_guest_preferences_to_menu(
            session, clerk_user_id=GUEST_A, restaurant_id=1
        )
        assert match.eligible_preference_values == []
        assert match.reason == "no_portable_preferences"
    finally:
        session.close()


def test_global_switch_off_blocks_match(
    preference_network_enabled, clean_preference_rows
):
    """Scenario 4: global personalization off → no cross-venue prefs used."""
    session = SessionLocal()
    try:
        _grant_collection_consent(session)
        _grant_cross_venue_consent(session)
        session.commit()
        signal = pref_svc.record_eligible_preference_signal(
            session, event=_voting_event()
        )
        session.commit()
        pref_svc.set_food_preference_portability(
            session, clerk_user_id=GUEST_A, preference_id=str(signal.id), enabled=True
        )
        session.commit()

        pref_svc.set_cross_venue_personalization(
            session, clerk_user_id=GUEST_A, enabled=False
        )
        session.commit()

        match = pref_svc.match_guest_preferences_to_menu(
            session, clerk_user_id=GUEST_A, restaurant_id=1
        )
        assert match.reason == "global_disabled"
        assert match.eligible_preference_values == []

        # Re-enable requires new consent; does not restore per-pref portability state
        # (portability flag on the signal remains true, but we verify consent was withdrawn)
        view = pref_svc.get_guest_preferences(session, clerk_user_id=GUEST_A)
        assert view.cross_venue_personalization_enabled is False
    finally:
        session.close()


def test_remove_inferred_blocks_recreate_from_same_source(
    preference_network_enabled, clean_preference_rows
):
    """Scenario 5: removed inferred preference is not recreated from same event."""
    session = SessionLocal()
    try:
        _grant_collection_consent(session)
        session.commit()
        signal = pref_svc.record_eligible_preference_signal(
            session, event=_voting_event(source_ref="voting_vote:recreate")
        )
        session.commit()
        pref_svc.remove_food_preference(
            session, clerk_user_id=GUEST_A, preference_id=str(signal.id)
        )
        session.commit()

        again = pref_svc.record_eligible_preference_signal(
            session, event=_voting_event(source_ref="voting_vote:recreate")
        )
        session.commit()
        assert again is None

        active = pref_svc.get_guest_preferences(session, clerk_user_id=GUEST_A)
        assert len(active.signals) == 0
        all_rows = pref_svc.get_guest_preferences(
            session, clerk_user_id=GUEST_A, include_removed=True
        )
        assert len(all_rows.signals) == 1
        assert all_rows.signals[0].removed_at is not None
    finally:
        session.close()


def test_guest_cannot_mutate_another_guest_preference_via_graphql(
    preference_network_enabled, clean_preference_rows
):
    """Scenario 8: guest A cannot modify guest B prefs (auth is self-only)."""
    session = SessionLocal()
    try:
        _grant_collection_consent(session, clerk_user_id=GUEST_B)
        session.commit()
        signal = pref_svc.record_eligible_preference_signal(
            session,
            event=_voting_event(clerk_user_id=GUEST_B, source_ref="voting_vote:b1"),
        )
        session.commit()
        pref_id = str(signal.id)
    finally:
        session.close()

    mutation = """
    mutation SetPort($id: ID!, $enabled: Boolean!) {
      setFoodPreferencePortability(id: $id, enabled: $enabled) {
        id
        portabilityEnabled
      }
    }
    """
    # Authenticated as GUEST_A — should not find GUEST_B's preference
    result = asyncio.run(
        schema.execute(
            mutation,
            variable_values={"id": pref_id, "enabled": True},
            context_value=_auth(GUEST_A),
        )
    )
    assert result.errors
    assert "not found" in str(result.errors[0]).lower()


def test_graphql_unauthenticated_food_profile_empty(clean_preference_rows):
    """Restaurant / anonymous cannot read Food Profile via guest query."""
    query = """
    query {
      myFoodProfile {
        profileId
        crossVenuePersonalizationEnabled
      }
      myFoodPreferences {
        id
      }
    }
    """
    result = asyncio.run(schema.execute(query, context_value={}))
    assert result.errors is None
    assert result.data["myFoodProfile"] is None
    assert result.data["myFoodPreferences"] == []


def test_legacy_purpose_rejected(preference_network_enabled, clean_preference_rows):
    session = SessionLocal()
    try:
        with pytest.raises(ValueError, match="superseded"):
            pref_svc.grant_preference_consent(
                session,
                clerk_user_id=GUEST_A,
                purpose="cross_restaurant_personalization",
                allowed_signal_categories=[SIGNAL_CATEGORY_VOTING],
                privacy_notice_version="pn-1.0",
                consent_version="cv-1.0",
                collection_method="test",
            )
    finally:
        session.close()


def test_withdraw_cross_venue_consent_stops_matching(
    preference_network_enabled, clean_preference_rows
):
    """Scenario 9: consent withdrawal stops processing for that purpose."""
    session = SessionLocal()
    try:
        _grant_collection_consent(session)
        _grant_cross_venue_consent(session)
        session.commit()
        signal = pref_svc.record_eligible_preference_signal(
            session, event=_voting_event()
        )
        session.commit()
        pref_svc.set_food_preference_portability(
            session, clerk_user_id=GUEST_A, preference_id=str(signal.id), enabled=True
        )
        session.commit()

        pref_svc.withdraw_preference_consent(
            session,
            clerk_user_id=GUEST_A,
            purpose=PURPOSE_CROSS_VENUE_PERSONALIZATION,
        )
        session.commit()

        match = pref_svc.match_guest_preferences_to_menu(
            session, clerk_user_id=GUEST_A, restaurant_id=1
        )
        assert match.reason == "global_disabled"
    finally:
        session.close()


def test_match_menu_stub_with_portable_prefs(
    preference_network_enabled, clean_preference_rows
):
    session = SessionLocal()
    try:
        _grant_collection_consent(session)
        _grant_cross_venue_consent(session)
        session.commit()
        signal = pref_svc.record_eligible_preference_signal(
            session, event=_voting_event()
        )
        session.commit()
        pref_svc.set_food_preference_portability(
            session, clerk_user_id=GUEST_A, preference_id=str(signal.id), enabled=True
        )
        session.commit()

        stub = pref_svc.match_guest_preferences_to_menu(
            session, clerk_user_id=GUEST_A, restaurant_id=123
        )
        assert stub.matched_menu_item_ids == []
        assert stub.restaurant_id == 123
        assert stub.reason == "match_engine_not_implemented"
        assert stub.eligible_preference_values == ["italian"]
    finally:
        session.close()


def test_graphql_grant_and_list_preferences(
    preference_network_enabled, clean_preference_rows
):
    grant = """
    mutation Grant {
      grantFoodPreferenceConsent(
        purpose: "preference_collection"
        allowedSignalCategories: ["explicit", "voting"]
        privacyNoticeVersion: "pn-1.0"
        consentVersion: "cv-1.0"
        collectionMethod: "graphql_test"
      ) {
        profileId
        crossVenuePersonalizationEnabled
        activeConsents { purpose }
      }
    }
    """
    result = asyncio.run(schema.execute(grant, context_value=_auth(GUEST_A)))
    assert result.errors is None
    assert result.data["grantFoodPreferenceConsent"]["profileId"] is not None
    purposes = [
        c["purpose"]
        for c in result.data["grantFoodPreferenceConsent"]["activeConsents"]
    ]
    assert PURPOSE_PREFERENCE_COLLECTION in purposes

    add = """
    mutation Add {
      addExplicitFoodPreference(
        preferenceType: "cuisine"
        preferenceValue: "italian"
      ) {
        id
        preferenceValue
        portabilityEnabled
        originKind
      }
    }
    """
    add_result = asyncio.run(schema.execute(add, context_value=_auth(GUEST_A)))
    assert add_result.errors is None
    pref = add_result.data["addExplicitFoodPreference"]
    assert pref["preferenceValue"] == "italian"
    assert pref["portabilityEnabled"] is False
    assert pref["originKind"] == "explicit"
