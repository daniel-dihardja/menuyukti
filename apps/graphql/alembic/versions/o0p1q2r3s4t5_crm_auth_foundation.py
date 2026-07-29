"""CRM device auth columns + challenge and audit tables.

Revision ID: o0p1q2r3s4t5
Revises: n9o0p1q2r3s4
Create Date: 2026-07-28

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "o0p1q2r3s4t5"
down_revision: str | Sequence[str] | None = "n9o0p1q2r3s4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "crm_device", sa.Column("refresh_token_hash", sa.String(length=64), nullable=True)
    )
    op.add_column(
        "crm_device",
        sa.Column("refresh_expires_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "crm_device",
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        op.f("ix_crm_device_refresh_token_hash"),
        "crm_device",
        ["refresh_token_hash"],
        unique=False,
    )

    op.create_table(
        "crm_auth_challenge",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("device_id", sa.Uuid(), nullable=False),
        sa.Column("nonce", sa.String(length=128), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["device_id"],
            ["crm_device.id"],
            name=op.f("fk_crm_auth_challenge_device_id_crm_device"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_crm_auth_challenge")),
    )
    op.create_index(
        op.f("ix_crm_auth_challenge_device_id"),
        "crm_auth_challenge",
        ["device_id"],
        unique=False,
    )

    op.create_table(
        "crm_audit_event",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("crm_app_id", sa.Integer(), nullable=True),
        sa.Column("customer_id", sa.Uuid(), nullable=True),
        sa.Column("device_id", sa.Uuid(), nullable=True),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("detail", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["crm_app_id"],
            ["crm_app.id"],
            name=op.f("fk_crm_audit_event_crm_app_id_crm_app"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_crm_audit_event")),
    )
    op.create_index(
        op.f("ix_crm_audit_event_crm_app_id"),
        "crm_audit_event",
        ["crm_app_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_crm_audit_event_created_at"),
        "crm_audit_event",
        ["created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_crm_audit_event_created_at"), table_name="crm_audit_event")
    op.drop_index(op.f("ix_crm_audit_event_crm_app_id"), table_name="crm_audit_event")
    op.drop_table("crm_audit_event")

    op.drop_index(op.f("ix_crm_auth_challenge_device_id"), table_name="crm_auth_challenge")
    op.drop_table("crm_auth_challenge")

    op.drop_index(op.f("ix_crm_device_refresh_token_hash"), table_name="crm_device")
    op.drop_column("crm_device", "last_seen_at")
    op.drop_column("crm_device", "refresh_expires_at")
    op.drop_column("crm_device", "refresh_token_hash")
