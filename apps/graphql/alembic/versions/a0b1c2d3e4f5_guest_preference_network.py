"""guest preference network foundation tables

Revision ID: a0b1c2d3e4f5
Revises: z9a0b1c2d3e4
Create Date: 2026-10-13

Additive only: profile, consent, and signal tables for the optional
Guest Preference Network Protocol. No backfill; processing remains off
until GUEST_PREFERENCE_NETWORK_ENABLED and explicit product approval.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "a0b1c2d3e4f5"
down_revision: str | Sequence[str] | None = "z9a0b1c2d3e4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_jsonb = postgresql.JSONB(astext_type=sa.Text()).with_variant(sa.JSON(), "sqlite")


def upgrade() -> None:
    op.create_table(
        "guest_preference_profile",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("clerk_user_id", sa.String(length=128), nullable=False),
        sa.Column(
            "status",
            sa.String(length=32),
            server_default=sa.text("'active'"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_guest_preference_profile")),
        sa.UniqueConstraint(
            "clerk_user_id",
            name=op.f("uq_guest_preference_profile_clerk_user_id"),
        ),
    )
    op.create_index(
        op.f("ix_guest_preference_profile_clerk_user_id"),
        "guest_preference_profile",
        ["clerk_user_id"],
        unique=False,
    )

    op.create_table(
        "guest_preference_consent",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("clerk_user_id", sa.String(length=128), nullable=False),
        sa.Column("purpose", sa.String(length=128), nullable=False),
        sa.Column(
            "allowed_signal_categories",
            _jsonb,
            server_default=sa.text("'[]'"),
            nullable=False,
        ),
        sa.Column("privacy_notice_version", sa.String(length=64), nullable=False),
        sa.Column("consent_version", sa.String(length=64), nullable=False),
        sa.Column(
            "granted_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("withdrawn_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("collection_method", sa.String(length=128), nullable=False),
        sa.Column("evidence_reference", sa.String(length=256), nullable=True),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_guest_preference_consent")),
    )
    op.create_index(
        "ix_guest_preference_consent_clerk_user_id",
        "guest_preference_consent",
        ["clerk_user_id"],
        unique=False,
    )
    op.create_index(
        "ix_guest_preference_consent_clerk_purpose",
        "guest_preference_consent",
        ["clerk_user_id", "purpose"],
        unique=False,
    )

    op.create_table(
        "guest_preference_signal",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("clerk_user_id", sa.String(length=128), nullable=False),
        sa.Column("preference_type", sa.String(length=64), nullable=False),
        sa.Column("preference_value", sa.String(length=128), nullable=False),
        sa.Column("source_type", sa.String(length=64), nullable=False),
        sa.Column("source_ref", sa.String(length=128), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column(
            "recorded_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("consent_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(
            ["consent_id"],
            ["guest_preference_consent.id"],
            name=op.f("fk_guest_preference_signal_consent_id_guest_preference_consent"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_guest_preference_signal")),
        sa.UniqueConstraint(
            "clerk_user_id",
            "source_type",
            "source_ref",
            "preference_type",
            "preference_value",
            name="uq_guest_preference_signal_idempotent",
        ),
    )
    op.create_index(
        "ix_guest_preference_signal_clerk_user_id",
        "guest_preference_signal",
        ["clerk_user_id"],
        unique=False,
    )
    op.create_index(
        "ix_guest_preference_signal_clerk_recorded",
        "guest_preference_signal",
        ["clerk_user_id", "recorded_at"],
        unique=False,
    )
    op.create_index(
        op.f("ix_guest_preference_signal_consent_id"),
        "guest_preference_signal",
        ["consent_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_guest_preference_signal_consent_id"),
        table_name="guest_preference_signal",
    )
    op.drop_index(
        "ix_guest_preference_signal_clerk_recorded",
        table_name="guest_preference_signal",
    )
    op.drop_index(
        "ix_guest_preference_signal_clerk_user_id",
        table_name="guest_preference_signal",
    )
    op.drop_table("guest_preference_signal")
    op.drop_index(
        "ix_guest_preference_consent_clerk_purpose",
        table_name="guest_preference_consent",
    )
    op.drop_index(
        "ix_guest_preference_consent_clerk_user_id",
        table_name="guest_preference_consent",
    )
    op.drop_table("guest_preference_consent")
    op.drop_index(
        op.f("ix_guest_preference_profile_clerk_user_id"),
        table_name="guest_preference_profile",
    )
    op.drop_table("guest_preference_profile")
