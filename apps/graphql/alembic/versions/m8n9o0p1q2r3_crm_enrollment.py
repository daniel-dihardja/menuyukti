"""crm_customer, crm_device, crm_enrollment_token

Revision ID: m8n9o0p1q2r3
Revises: l7m8n9o0p1q2
Create Date: 2026-07-28

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "m8n9o0p1q2r3"
down_revision: str | Sequence[str] | None = "l7m8n9o0p1q2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "crm_customer",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("crm_app_id", sa.Integer(), nullable=False),
        sa.Column("phone_e164", sa.String(length=32), nullable=False),
        sa.Column("display_name", sa.String(length=256), nullable=True),
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
        sa.ForeignKeyConstraint(
            ["crm_app_id"],
            ["crm_app.id"],
            name=op.f("fk_crm_customer_crm_app_id_crm_app"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_crm_customer")),
    )
    op.create_index(op.f("ix_crm_customer_crm_app_id"), "crm_customer", ["crm_app_id"], unique=False)
    op.create_index(
        op.f("uq_crm_customer_app_phone"),
        "crm_customer",
        ["crm_app_id", "phone_e164"],
        unique=True,
    )

    op.create_table(
        "crm_device",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("customer_id", sa.Uuid(), nullable=False),
        sa.Column("public_key", sa.Text(), nullable=False),
        sa.Column("platform", sa.String(length=64), nullable=False),
        sa.Column("label", sa.String(length=256), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
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
        sa.ForeignKeyConstraint(
            ["customer_id"],
            ["crm_customer.id"],
            name=op.f("fk_crm_device_customer_id_crm_customer"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_crm_device")),
    )
    op.create_index(op.f("ix_crm_device_customer_id"), "crm_device", ["customer_id"], unique=False)

    op.create_table(
        "crm_enrollment_token",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("crm_app_id", sa.Integer(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("created_by_clerk_user_id", sa.String(length=128), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["crm_app_id"],
            ["crm_app.id"],
            name=op.f("fk_crm_enrollment_token_crm_app_id_crm_app"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_crm_enrollment_token")),
    )
    op.create_index(
        op.f("ix_crm_enrollment_token_crm_app_id"),
        "crm_enrollment_token",
        ["crm_app_id"],
        unique=False,
    )
    op.create_index(
        op.f("uq_crm_enrollment_token_token_hash"),
        "crm_enrollment_token",
        ["token_hash"],
        unique=True,
    )
    op.create_index(
        op.f("ix_crm_enrollment_token_created_by_clerk_user_id"),
        "crm_enrollment_token",
        ["created_by_clerk_user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_crm_enrollment_token_created_by_clerk_user_id"),
        table_name="crm_enrollment_token",
    )
    op.drop_index(op.f("uq_crm_enrollment_token_token_hash"), table_name="crm_enrollment_token")
    op.drop_index(op.f("ix_crm_enrollment_token_crm_app_id"), table_name="crm_enrollment_token")
    op.drop_table("crm_enrollment_token")

    op.drop_index(op.f("ix_crm_device_customer_id"), table_name="crm_device")
    op.drop_table("crm_device")

    op.drop_index(op.f("uq_crm_customer_app_phone"), table_name="crm_customer")
    op.drop_index(op.f("ix_crm_customer_crm_app_id"), table_name="crm_customer")
    op.drop_table("crm_customer")
