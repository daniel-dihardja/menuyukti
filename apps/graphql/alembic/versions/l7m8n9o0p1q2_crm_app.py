"""crm_app: workspace-scoped CRM registration apps

Revision ID: l7m8n9o0p1q2
Revises: k6l7m8n9o0p1
Create Date: 2026-07-28

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "l7m8n9o0p1q2"
down_revision: str | Sequence[str] | None = "k6l7m8n9o0p1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "crm_app",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("app_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=256), nullable=False),
        sa.Column("workspace_id", sa.Integer(), nullable=False),
        sa.Column("created_by_clerk_user_id", sa.String(length=128), nullable=False),
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
            ["workspace_id"],
            ["workspace.id"],
            name=op.f("fk_crm_app_workspace_id_workspace"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_crm_app")),
    )
    op.create_index(op.f("ix_crm_app_workspace_id"), "crm_app", ["workspace_id"], unique=False)
    op.create_index(op.f("uq_crm_app_app_id"), "crm_app", ["app_id"], unique=True)
    op.create_index(
        op.f("ix_crm_app_created_by_clerk_user_id"),
        "crm_app",
        ["created_by_clerk_user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_crm_app_created_by_clerk_user_id"), table_name="crm_app")
    op.drop_index(op.f("uq_crm_app_app_id"), table_name="crm_app")
    op.drop_index(op.f("ix_crm_app_workspace_id"), table_name="crm_app")
    op.drop_table("crm_app")
