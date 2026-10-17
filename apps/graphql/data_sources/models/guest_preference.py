"""Guest preference network: optional profile, consent, and derived signals.

Boundary B/C — separate from restaurant operational data (votes, POS, CRM).
Keyed by Clerk ``clerk_user_id`` only; never silently merge CRM customers.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from graphql.data_sources.database import Base

if TYPE_CHECKING:
    from graphql.data_sources.models.location import Location

PROFILE_STATUS_ACTIVE = "active"
PROFILE_STATUS_DISABLED = "disabled"
PROFILE_STATUS_PENDING_DELETION = "pending_deletion"
KNOWN_PROFILE_STATUSES = frozenset(
    {
        PROFILE_STATUS_ACTIVE,
        PROFILE_STATUS_DISABLED,
        PROFILE_STATUS_PENDING_DELETION,
    }
)

ORIGIN_KIND_EXPLICIT = "explicit"
ORIGIN_KIND_INFERRED = "inferred"


class GuestPreferenceProfile(Base):
    """Optional portable preference profile for a Clerk guest."""

    __tablename__ = "guest_preference_profile"
    __table_args__ = (
        UniqueConstraint(
            "clerk_user_id",
            name="uq_guest_preference_profile_clerk_user_id",
        ),
        Index("ix_guest_preference_profile_clerk_user_id", "clerk_user_id", unique=False),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    clerk_user_id: Mapped[str] = mapped_column(String(128), nullable=False)
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=PROFILE_STATUS_ACTIVE,
        server_default=text(f"'{PROFILE_STATUS_ACTIVE}'"),
    )
    cross_venue_personalization_enabled: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("false"),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class GuestPreferenceConsent(Base):
    """Purpose-scoped consent (collection vs cross-venue personalization)."""

    __tablename__ = "guest_preference_consent"
    __table_args__ = (
        Index("ix_guest_preference_consent_clerk_user_id", "clerk_user_id"),
        Index(
            "ix_guest_preference_consent_clerk_purpose",
            "clerk_user_id",
            "purpose",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    clerk_user_id: Mapped[str] = mapped_column(String(128), nullable=False)
    purpose: Mapped[str] = mapped_column(String(128), nullable=False)
    allowed_signal_categories: Mapped[list[Any]] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"),
        nullable=False,
        default=list,
        server_default=text("'[]'"),
    )
    privacy_notice_version: Mapped[str] = mapped_column(String(64), nullable=False)
    consent_version: Mapped[str] = mapped_column(String(64), nullable=False)
    granted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    withdrawn_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    collection_method: Mapped[str] = mapped_column(String(128), nullable=False)
    evidence_reference: Mapped[str | None] = mapped_column(String(256), nullable=True)

    signals: Mapped[list[GuestPreferenceSignal]] = relationship(
        "GuestPreferenceSignal",
        back_populates="consent",
    )


class GuestPreferenceSignal(Base):
    """Normalized preference signal with opaque source provenance and portability."""

    __tablename__ = "guest_preference_signal"
    __table_args__ = (
        UniqueConstraint(
            "clerk_user_id",
            "source_type",
            "source_ref",
            "preference_type",
            "preference_value",
            name="uq_guest_preference_signal_idempotent",
        ),
        Index("ix_guest_preference_signal_clerk_user_id", "clerk_user_id"),
        Index(
            "ix_guest_preference_signal_clerk_recorded",
            "clerk_user_id",
            "recorded_at",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    clerk_user_id: Mapped[str] = mapped_column(String(128), nullable=False)
    preference_type: Mapped[str] = mapped_column(String(64), nullable=False)
    preference_value: Mapped[str] = mapped_column(String(128), nullable=False)
    source_type: Mapped[str] = mapped_column(String(64), nullable=False)
    source_ref: Mapped[str] = mapped_column(String(128), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    origin_kind: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=ORIGIN_KIND_INFERRED,
        server_default=text(f"'{ORIGIN_KIND_INFERRED}'"),
    )
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    origin_location_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("location.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    portability_enabled: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("false"),
    )
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    removed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    consent_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("guest_preference_consent.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    consent: Mapped[GuestPreferenceConsent] = relationship(
        "GuestPreferenceConsent",
        back_populates="signals",
    )
    origin_location: Mapped[Location | None] = relationship(
        "Location",
        foreign_keys=[origin_location_id],
    )
