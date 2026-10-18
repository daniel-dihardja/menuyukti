"""Guest Preference Network — Food Profile + personalization service boundary.

Inactive by default (``GUEST_PREFERENCE_NETWORK_ENABLED``). Not wired into
Voting / Pick & Win / POS producers until explicit product approval.
Restaurant APIs must not expose these records.
"""

from __future__ import annotations

import os
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from graphql.data_sources.models.guest_preference import (
    ORIGIN_KIND_EXPLICIT,
    ORIGIN_KIND_INFERRED,
    PROFILE_STATUS_ACTIVE,
    GuestPreferenceConsent,
    GuestPreferenceProfile,
    GuestPreferenceSignal,
)
from graphql.data_sources.models.location import Location
from graphql.domain.food_taxonomy import (
    normalize_preference_type,
    normalize_preference_value,
)
from graphql.domain.guest_preference_catalog import (
    ENV_FEATURE_FLAG,
    PURPOSE_CROSS_VENUE_PERSONALIZATION,
    PURPOSE_PREFERENCE_COLLECTION,
    SIGNAL_CATEGORY_EXPLICIT,
    SOURCE_TYPE_EXPLICIT,
    SOURCE_TYPE_PREDICTION_VOTE,
    SOURCE_TYPE_TO_CATEGORY,
    normalize_purpose,
    normalize_signal_categories,
)


def is_guest_preference_network_enabled() -> bool:
    return os.environ.get(ENV_FEATURE_FLAG, "").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


def _require_clerk_user_id(clerk_user_id: str) -> str:
    user_id = (clerk_user_id or "").strip()
    if not user_id:
        raise ValueError("clerk_user_id is required (anonymous guests cannot join the network)")
    return user_id


def _now() -> datetime:
    return datetime.now(UTC)


def _parse_uuid(raw: str) -> uuid.UUID:
    try:
        return uuid.UUID(str(raw).strip())
    except (ValueError, AttributeError, TypeError) as exc:
        raise ValueError("Invalid preference id") from exc


@dataclass(frozen=True, slots=True)
class PreferenceSignalEvent:
    """Eligible interaction event for preference processing.

    ``preference_type`` / ``preference_value`` must already be normalized
    taxonomy keys when source is voting — free-text vote labels alone are
    not sufficient.
    """

    clerk_user_id: str
    source_type: str
    source_ref: str
    preference_type: str
    preference_value: str
    confidence: float = 1.0
    purpose: str = PURPOSE_PREFERENCE_COLLECTION
    explanation: str | None = None
    origin_location_id: int | None = None


@dataclass(frozen=True, slots=True)
class PreferenceSignalView:
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


@dataclass(frozen=True, slots=True)
class ConsentSummaryView:
    id: str
    purpose: str
    allowed_signal_categories: list[str]
    privacy_notice_version: str
    consent_version: str
    granted_at: datetime
    withdrawn_at: datetime | None


@dataclass(frozen=True, slots=True)
class GuestPreferencesView:
    clerk_user_id: str
    profile_id: str | None
    profile_status: str | None
    cross_venue_personalization_enabled: bool
    signals: list[PreferenceSignalView]
    active_consents: list[ConsentSummaryView]


@dataclass(frozen=True, slots=True)
class MenuMatchStub:
    """Future Digital Menu matching — stub only (no ML)."""

    guest_id: str
    restaurant_id: int
    matched_menu_item_ids: list[int]
    reason: str
    eligible_preference_values: list[str]


@dataclass(frozen=True, slots=True)
class EligibilityResult:
    eligible: bool
    reason: str
    signal_category: str | None = None


def evaluate_preference_eligibility(
    clerk_user_id: str,
    event: PreferenceSignalEvent,
) -> EligibilityResult:
    """Pure eligibility rules (does not require DB or feature flag)."""
    try:
        user_id = _require_clerk_user_id(clerk_user_id)
    except ValueError as exc:
        return EligibilityResult(eligible=False, reason=str(exc))

    if (event.clerk_user_id or "").strip() != user_id:
        return EligibilityResult(
            eligible=False,
            reason="event clerk_user_id does not match guest",
        )

    source_type = (event.source_type or "").strip()
    if source_type == SOURCE_TYPE_PREDICTION_VOTE:
        return EligibilityResult(
            eligible=False,
            reason="pick_and_win_prediction_not_food_preference",
            signal_category=None,
        )

    category = SOURCE_TYPE_TO_CATEGORY.get(source_type)
    if category is None:
        return EligibilityResult(
            eligible=False,
            reason=f"source_type_not_eligible:{source_type or 'empty'}",
        )

    if not (event.source_ref or "").strip():
        return EligibilityResult(eligible=False, reason="source_ref_required")

    try:
        normalize_preference_type(event.preference_type)
        normalize_preference_value(
            preference_type=event.preference_type,
            preference_value=event.preference_value,
        )
    except ValueError as exc:
        return EligibilityResult(eligible=False, reason=str(exc))

    if not (0.0 <= float(event.confidence) <= 1.0):
        return EligibilityResult(eligible=False, reason="confidence_out_of_range")

    return EligibilityResult(
        eligible=True,
        reason="ok",
        signal_category=category,
    )


def _active_consent(
    session: Session,
    *,
    clerk_user_id: str,
    purpose: str,
) -> GuestPreferenceConsent | None:
    rows = session.scalars(
        select(GuestPreferenceConsent)
        .where(
            GuestPreferenceConsent.clerk_user_id == clerk_user_id,
            GuestPreferenceConsent.purpose == purpose,
            GuestPreferenceConsent.withdrawn_at.is_(None),
        )
        .order_by(GuestPreferenceConsent.granted_at.desc())
    ).all()
    return rows[0] if rows else None


def _list_active_consents(
    session: Session, *, clerk_user_id: str
) -> list[GuestPreferenceConsent]:
    return list(
        session.scalars(
            select(GuestPreferenceConsent)
            .where(
                GuestPreferenceConsent.clerk_user_id == clerk_user_id,
                GuestPreferenceConsent.withdrawn_at.is_(None),
            )
            .order_by(GuestPreferenceConsent.granted_at.desc())
        ).all()
    )


def _ensure_profile(session: Session, *, clerk_user_id: str) -> GuestPreferenceProfile:
    existing = session.scalar(
        select(GuestPreferenceProfile).where(
            GuestPreferenceProfile.clerk_user_id == clerk_user_id
        )
    )
    if existing is not None:
        if existing.status != PROFILE_STATUS_ACTIVE:
            existing.status = PROFILE_STATUS_ACTIVE
            existing.updated_at = _now()
        return existing
    profile = GuestPreferenceProfile(
        id=uuid.uuid4(),
        clerk_user_id=clerk_user_id,
        status=PROFILE_STATUS_ACTIVE,
        cross_venue_personalization_enabled=False,
    )
    session.add(profile)
    session.flush()
    return profile


def _signal_to_view(
    row: GuestPreferenceSignal, *, location_name: str | None = None
) -> PreferenceSignalView:
    return PreferenceSignalView(
        id=str(row.id),
        preference_type=row.preference_type,
        preference_value=row.preference_value,
        source_type=row.source_type,
        source_ref=row.source_ref,
        confidence=float(row.confidence),
        origin_kind=row.origin_kind,
        explanation=row.explanation,
        origin_location_id=row.origin_location_id,
        origin_location_name=location_name,
        portability_enabled=bool(row.portability_enabled),
        recorded_at=row.recorded_at,
        updated_at=row.updated_at,
        expires_at=row.expires_at,
        removed_at=row.removed_at,
        consent_id=str(row.consent_id),
    )


def _consent_to_summary(row: GuestPreferenceConsent) -> ConsentSummaryView:
    cats = row.allowed_signal_categories or []
    return ConsentSummaryView(
        id=str(row.id),
        purpose=row.purpose,
        allowed_signal_categories=[str(c) for c in cats],
        privacy_notice_version=row.privacy_notice_version,
        consent_version=row.consent_version,
        granted_at=row.granted_at,
        withdrawn_at=row.withdrawn_at,
    )


def _location_names(
    session: Session, location_ids: set[int]
) -> dict[int, str]:
    if not location_ids:
        return {}
    rows = session.scalars(
        select(Location).where(Location.id.in_(sorted(location_ids)))
    ).all()
    return {int(r.id): str(r.name) for r in rows}


def grant_preference_consent(
    session: Session,
    *,
    clerk_user_id: str,
    purpose: str,
    allowed_signal_categories: list[str],
    privacy_notice_version: str,
    consent_version: str,
    collection_method: str,
    evidence_reference: str | None = None,
) -> GuestPreferenceConsent:
    """Record consent and lazily create the preference profile."""
    user_id = _require_clerk_user_id(clerk_user_id)
    purpose_key = normalize_purpose(purpose)
    categories = normalize_signal_categories(allowed_signal_categories)
    notice = (privacy_notice_version or "").strip()
    version = (consent_version or "").strip()
    method = (collection_method or "").strip()
    if not notice or not version or not method:
        raise ValueError(
            "privacy_notice_version, consent_version, and collection_method are required"
        )

    active = _active_consent(session, clerk_user_id=user_id, purpose=purpose_key)
    if active is not None:
        active.withdrawn_at = _now()

    profile = _ensure_profile(session, clerk_user_id=user_id)
    if purpose_key == PURPOSE_CROSS_VENUE_PERSONALIZATION:
        profile.cross_venue_personalization_enabled = True
        profile.updated_at = _now()

    consent = GuestPreferenceConsent(
        id=uuid.uuid4(),
        clerk_user_id=user_id,
        purpose=purpose_key,
        allowed_signal_categories=categories,
        privacy_notice_version=notice,
        consent_version=version,
        granted_at=_now(),
        withdrawn_at=None,
        collection_method=method,
        evidence_reference=(evidence_reference or "").strip() or None,
    )
    session.add(consent)
    session.flush()
    return consent


def withdraw_preference_consent(
    session: Session,
    *,
    clerk_user_id: str,
    purpose: str,
) -> GuestPreferenceConsent | None:
    """Withdraw consent for a purpose; apply retention side effects."""
    user_id = _require_clerk_user_id(clerk_user_id)
    purpose_key = normalize_purpose(purpose)
    consent = _active_consent(session, clerk_user_id=user_id, purpose=purpose_key)
    if consent is None:
        return None

    now = _now()
    consent.withdrawn_at = now

    if purpose_key == PURPOSE_CROSS_VENUE_PERSONALIZATION:
        profile = session.scalar(
            select(GuestPreferenceProfile).where(
                GuestPreferenceProfile.clerk_user_id == user_id
            )
        )
        if profile is not None:
            profile.cross_venue_personalization_enabled = False
            profile.updated_at = now

    if purpose_key == PURPOSE_PREFERENCE_COLLECTION:
        signals = session.scalars(
            select(GuestPreferenceSignal).where(
                GuestPreferenceSignal.consent_id == consent.id,
                GuestPreferenceSignal.origin_kind == ORIGIN_KIND_INFERRED,
                GuestPreferenceSignal.removed_at.is_(None),
            )
        ).all()
        for signal in signals:
            signal.expires_at = now
            signal.updated_at = now

    session.flush()
    return consent


def set_cross_venue_personalization(
    session: Session,
    *,
    clerk_user_id: str,
    enabled: bool,
    privacy_notice_version: str | None = None,
    consent_version: str | None = None,
    collection_method: str | None = None,
    evidence_reference: str | None = None,
    allowed_signal_categories: list[str] | None = None,
) -> GuestPreferenceProfile:
    """Guest global switch. Re-enable requires a fresh cross-venue consent grant."""
    user_id = _require_clerk_user_id(clerk_user_id)
    profile = _ensure_profile(session, clerk_user_id=user_id)

    if not enabled:
        profile.cross_venue_personalization_enabled = False
        profile.updated_at = _now()
        active = _active_consent(
            session,
            clerk_user_id=user_id,
            purpose=PURPOSE_CROSS_VENUE_PERSONALIZATION,
        )
        if active is not None:
            active.withdrawn_at = _now()
        session.flush()
        return profile

    categories = allowed_signal_categories or [SIGNAL_CATEGORY_EXPLICIT]
    grant_preference_consent(
        session,
        clerk_user_id=user_id,
        purpose=PURPOSE_CROSS_VENUE_PERSONALIZATION,
        allowed_signal_categories=categories,
        privacy_notice_version=privacy_notice_version or "",
        consent_version=consent_version or "",
        collection_method=collection_method or "",
        evidence_reference=evidence_reference,
    )
    profile = session.scalar(
        select(GuestPreferenceProfile).where(
            GuestPreferenceProfile.clerk_user_id == user_id
        )
    )
    assert profile is not None
    return profile


def get_guest_preferences(
    session: Session,
    *,
    clerk_user_id: str,
    include_expired: bool = False,
    include_removed: bool = False,
) -> GuestPreferencesView:
    user_id = _require_clerk_user_id(clerk_user_id)
    profile = session.scalar(
        select(GuestPreferenceProfile).where(
            GuestPreferenceProfile.clerk_user_id == user_id
        )
    )
    stmt = select(GuestPreferenceSignal).where(
        GuestPreferenceSignal.clerk_user_id == user_id
    )
    if not include_removed:
        stmt = stmt.where(GuestPreferenceSignal.removed_at.is_(None))
    if not include_expired:
        stmt = stmt.where(
            (GuestPreferenceSignal.expires_at.is_(None))
            | (GuestPreferenceSignal.expires_at > _now())
        )
    stmt = stmt.order_by(GuestPreferenceSignal.recorded_at.desc())
    rows = list(session.scalars(stmt).all())
    names = _location_names(
        session,
        {int(r.origin_location_id) for r in rows if r.origin_location_id is not None},
    )
    consents = [_consent_to_summary(c) for c in _list_active_consents(session, clerk_user_id=user_id)]
    return GuestPreferencesView(
        clerk_user_id=user_id,
        profile_id=str(profile.id) if profile else None,
        profile_status=profile.status if profile else None,
        cross_venue_personalization_enabled=bool(
            profile.cross_venue_personalization_enabled if profile else False
        ),
        signals=[
            _signal_to_view(
                row,
                location_name=names.get(int(row.origin_location_id))
                if row.origin_location_id is not None
                else None,
            )
            for row in rows
        ],
        active_consents=consents,
    )


def get_food_preference(
    session: Session,
    *,
    clerk_user_id: str,
    preference_id: str,
) -> PreferenceSignalView | None:
    user_id = _require_clerk_user_id(clerk_user_id)
    pref_uuid = _parse_uuid(preference_id)
    row = session.scalar(
        select(GuestPreferenceSignal).where(
            GuestPreferenceSignal.id == pref_uuid,
            GuestPreferenceSignal.clerk_user_id == user_id,
        )
    )
    if row is None:
        return None
    name = None
    if row.origin_location_id is not None:
        loc = session.get(Location, row.origin_location_id)
        name = loc.name if loc is not None else None
    return _signal_to_view(row, location_name=name)


def record_eligible_preference_signal(
    session: Session,
    *,
    event: PreferenceSignalEvent,
) -> GuestPreferenceSignal | None:
    """Create an idempotent preference signal when flag, eligibility, and collection consent allow."""
    if not is_guest_preference_network_enabled():
        return None

    user_id = _require_clerk_user_id(event.clerk_user_id)
    eligibility = evaluate_preference_eligibility(user_id, event)
    if not eligibility.eligible or eligibility.signal_category is None:
        return None

    # Inferred/derived signals require collection consent (not portability purpose).
    purpose_key = normalize_purpose(event.purpose or PURPOSE_PREFERENCE_COLLECTION)
    if purpose_key != PURPOSE_PREFERENCE_COLLECTION:
        # Events create stored prefs under collection only.
        purpose_key = PURPOSE_PREFERENCE_COLLECTION

    consent = _active_consent(session, clerk_user_id=user_id, purpose=purpose_key)
    if consent is None:
        return None

    allowed = set(consent.allowed_signal_categories or [])
    if eligibility.signal_category not in allowed:
        return None

    preference_type = normalize_preference_type(event.preference_type)
    preference_value = normalize_preference_value(
        preference_type=preference_type,
        preference_value=event.preference_value,
    )
    source_type = (event.source_type or "").strip()
    source_ref = (event.source_ref or "").strip()

    existing = session.scalar(
        select(GuestPreferenceSignal).where(
            GuestPreferenceSignal.clerk_user_id == user_id,
            GuestPreferenceSignal.source_type == source_type,
            GuestPreferenceSignal.source_ref == source_ref,
            GuestPreferenceSignal.preference_type == preference_type,
            GuestPreferenceSignal.preference_value == preference_value,
        )
    )
    if existing is not None:
        # Soft-deleted or any prior row for this provenance: do not recreate.
        return None if existing.removed_at is not None else existing

    _ensure_profile(session, clerk_user_id=user_id)
    now = _now()
    explanation = (event.explanation or "").strip() or None

    try:
        with session.begin_nested():
            signal = GuestPreferenceSignal(
                id=uuid.uuid4(),
                clerk_user_id=user_id,
                preference_type=preference_type,
                preference_value=preference_value,
                source_type=source_type,
                source_ref=source_ref,
                confidence=float(event.confidence),
                origin_kind=ORIGIN_KIND_INFERRED,
                explanation=explanation
                or "Based on an eligible interaction you authorized for preference collection",
                origin_location_id=event.origin_location_id,
                portability_enabled=False,
                recorded_at=now,
                updated_at=now,
                expires_at=None,
                removed_at=None,
                consent_id=consent.id,
            )
            session.add(signal)
            session.flush()
    except IntegrityError:
        again = session.scalar(
            select(GuestPreferenceSignal).where(
                GuestPreferenceSignal.clerk_user_id == user_id,
                GuestPreferenceSignal.source_type == source_type,
                GuestPreferenceSignal.source_ref == source_ref,
                GuestPreferenceSignal.preference_type == preference_type,
                GuestPreferenceSignal.preference_value == preference_value,
            )
        )
        if again is not None and again.removed_at is not None:
            return None
        return again
    return signal


def add_explicit_food_preference(
    session: Session,
    *,
    clerk_user_id: str,
    preference_type: str,
    preference_value: str,
    explanation: str | None = None,
) -> GuestPreferenceSignal:
    """Guest-stated preference; requires collection consent including explicit category."""
    if not is_guest_preference_network_enabled():
        raise ValueError("Guest preference network is disabled")

    user_id = _require_clerk_user_id(clerk_user_id)
    consent = _active_consent(
        session, clerk_user_id=user_id, purpose=PURPOSE_PREFERENCE_COLLECTION
    )
    if consent is None:
        raise ValueError("Active preference_collection consent is required")
    allowed = set(consent.allowed_signal_categories or [])
    if SIGNAL_CATEGORY_EXPLICIT not in allowed:
        raise ValueError("Collection consent does not allow explicit preferences")

    ptype = normalize_preference_type(preference_type)
    pvalue = normalize_preference_value(preference_type=ptype, preference_value=preference_value)
    source_ref = f"explicit:{ptype}:{pvalue}"
    existing = session.scalar(
        select(GuestPreferenceSignal).where(
            GuestPreferenceSignal.clerk_user_id == user_id,
            GuestPreferenceSignal.source_type == SOURCE_TYPE_EXPLICIT,
            GuestPreferenceSignal.source_ref == source_ref,
            GuestPreferenceSignal.preference_type == ptype,
            GuestPreferenceSignal.preference_value == pvalue,
            GuestPreferenceSignal.removed_at.is_(None),
        )
    )
    if existing is not None:
        return existing

    _ensure_profile(session, clerk_user_id=user_id)
    now = _now()
    signal = GuestPreferenceSignal(
        id=uuid.uuid4(),
        clerk_user_id=user_id,
        preference_type=ptype,
        preference_value=pvalue,
        source_type=SOURCE_TYPE_EXPLICIT,
        source_ref=source_ref,
        confidence=1.0,
        origin_kind=ORIGIN_KIND_EXPLICIT,
        explanation=(explanation or "").strip() or "Added by you to your Food Profile",
        origin_location_id=None,
        portability_enabled=False,
        recorded_at=now,
        updated_at=now,
        expires_at=None,
        removed_at=None,
        consent_id=consent.id,
    )
    session.add(signal)
    session.flush()
    return signal


def _owned_active_signal(
    session: Session, *, clerk_user_id: str, preference_id: str
) -> GuestPreferenceSignal:
    user_id = _require_clerk_user_id(clerk_user_id)
    pref_uuid = _parse_uuid(preference_id)
    row = session.scalar(
        select(GuestPreferenceSignal).where(
            GuestPreferenceSignal.id == pref_uuid,
            GuestPreferenceSignal.clerk_user_id == user_id,
            GuestPreferenceSignal.removed_at.is_(None),
        )
    )
    if row is None:
        raise ValueError("Preference not found")
    return row


def update_food_preference(
    session: Session,
    *,
    clerk_user_id: str,
    preference_id: str,
    preference_value: str,
) -> GuestPreferenceSignal:
    row = _owned_active_signal(
        session, clerk_user_id=clerk_user_id, preference_id=preference_id
    )
    new_value = normalize_preference_value(
        preference_type=row.preference_type,
        preference_value=preference_value,
    )
    row.preference_value = new_value
    row.updated_at = _now()
    session.flush()
    return row


def remove_food_preference(
    session: Session,
    *,
    clerk_user_id: str,
    preference_id: str,
) -> GuestPreferenceSignal:
    row = _owned_active_signal(
        session, clerk_user_id=clerk_user_id, preference_id=preference_id
    )
    now = _now()
    row.removed_at = now
    row.portability_enabled = False
    row.updated_at = now
    session.flush()
    return row


def set_food_preference_portability(
    session: Session,
    *,
    clerk_user_id: str,
    preference_id: str,
    enabled: bool,
) -> GuestPreferenceSignal:
    row = _owned_active_signal(
        session, clerk_user_id=clerk_user_id, preference_id=preference_id
    )
    row.portability_enabled = bool(enabled)
    row.updated_at = _now()
    session.flush()
    return row


def list_cross_venue_eligible_preferences(
    session: Session,
    *,
    clerk_user_id: str,
) -> tuple[list[GuestPreferenceSignal], str]:
    """Return portable prefs eligible for cross-venue matching, plus reason if empty."""
    user_id = _require_clerk_user_id(clerk_user_id)
    profile = session.scalar(
        select(GuestPreferenceProfile).where(
            GuestPreferenceProfile.clerk_user_id == user_id
        )
    )
    if profile is None or not profile.cross_venue_personalization_enabled:
        return [], "global_disabled"

    portability_consent = _active_consent(
        session,
        clerk_user_id=user_id,
        purpose=PURPOSE_CROSS_VENUE_PERSONALIZATION,
    )
    if portability_consent is None:
        return [], "global_disabled"

    now = _now()
    rows = list(
        session.scalars(
            select(GuestPreferenceSignal).where(
                GuestPreferenceSignal.clerk_user_id == user_id,
                GuestPreferenceSignal.portability_enabled.is_(True),
                GuestPreferenceSignal.removed_at.is_(None),
                (GuestPreferenceSignal.expires_at.is_(None))
                | (GuestPreferenceSignal.expires_at > now),
            )
        ).all()
    )
    if not rows:
        return [], "no_portable_preferences"
    return rows, "ok"


def delete_guest_preference_profile(
    session: Session,
    *,
    clerk_user_id: str,
) -> bool:
    """Hard-delete profile and signals; retain consent rows as withdrawal evidence."""
    user_id = _require_clerk_user_id(clerk_user_id)
    now = _now()

    active_consents = session.scalars(
        select(GuestPreferenceConsent).where(
            GuestPreferenceConsent.clerk_user_id == user_id,
            GuestPreferenceConsent.withdrawn_at.is_(None),
        )
    ).all()
    for consent in active_consents:
        consent.withdrawn_at = now

    signals = session.scalars(
        select(GuestPreferenceSignal).where(
            GuestPreferenceSignal.clerk_user_id == user_id
        )
    ).all()
    for signal in signals:
        session.delete(signal)

    profile = session.scalar(
        select(GuestPreferenceProfile).where(
            GuestPreferenceProfile.clerk_user_id == user_id
        )
    )
    deleted = False
    if profile is not None:
        session.delete(profile)
        deleted = True
    session.flush()
    return deleted


def export_guest_food_profile(
    session: Session,
    *,
    clerk_user_id: str,
) -> dict[str, Any]:
    view = get_guest_preferences(
        session,
        clerk_user_id=clerk_user_id,
        include_expired=True,
        include_removed=True,
    )
    return {
        "clerk_user_id": view.clerk_user_id,
        "profile_id": view.profile_id,
        "profile_status": view.profile_status,
        "cross_venue_personalization_enabled": view.cross_venue_personalization_enabled,
        "active_consents": [
            {
                "id": c.id,
                "purpose": c.purpose,
                "allowed_signal_categories": c.allowed_signal_categories,
                "privacy_notice_version": c.privacy_notice_version,
                "consent_version": c.consent_version,
                "granted_at": c.granted_at.isoformat(),
                "withdrawn_at": c.withdrawn_at.isoformat() if c.withdrawn_at else None,
            }
            for c in view.active_consents
        ],
        "preferences": [
            {
                "id": s.id,
                "preference_type": s.preference_type,
                "preference_value": s.preference_value,
                "source_type": s.source_type,
                "source_ref": s.source_ref,
                "confidence": s.confidence,
                "origin_kind": s.origin_kind,
                "explanation": s.explanation,
                "origin_location_id": s.origin_location_id,
                "origin_location_name": s.origin_location_name,
                "portability_enabled": s.portability_enabled,
                "recorded_at": s.recorded_at.isoformat(),
                "updated_at": s.updated_at.isoformat(),
                "expires_at": s.expires_at.isoformat() if s.expires_at else None,
                "removed_at": s.removed_at.isoformat() if s.removed_at else None,
                "consent_id": s.consent_id,
            }
            for s in view.signals
        ],
    }


def match_guest_preferences_to_menu(
    session: Session,
    *,
    clerk_user_id: str,
    restaurant_id: int,
) -> MenuMatchStub:
    """Stub matcher: applies portability gates; no ML / embeddings."""
    user_id = _require_clerk_user_id(clerk_user_id)
    eligible, reason = list_cross_venue_eligible_preferences(
        session, clerk_user_id=user_id
    )
    values = sorted({r.preference_value for r in eligible})
    if reason != "ok":
        return MenuMatchStub(
            guest_id=user_id,
            restaurant_id=int(restaurant_id),
            matched_menu_item_ids=[],
            reason=reason,
            eligible_preference_values=values,
        )
    return MenuMatchStub(
        guest_id=user_id,
        restaurant_id=int(restaurant_id),
        matched_menu_item_ids=[],
        reason="match_engine_not_implemented",
        eligible_preference_values=values,
    )

