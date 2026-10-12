"""POS P0 fiscalization prep: pos_fiscal_process table

Revision ID: r1s2t3u4v5w6
Revises: q0r1s2t3u4v5
Create Date: 2026-10-10

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "r1s2t3u4v5w6"
down_revision: str | Sequence[str] | None = "q0r1s2t3u4v5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "pos_fiscal_process",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("pos_order_id", sa.Integer(), nullable=False),
        sa.Column("kind", sa.String(length=16), nullable=False),
        sa.Column("state", sa.String(length=16), nullable=False),
        sa.Column("provider", sa.String(length=32), nullable=False),
        sa.Column("tse_transaction_id", sa.String(length=128), nullable=True),
        sa.Column("tse_signature", sa.Text(), nullable=True),
        sa.Column("signature_counter", sa.Integer(), nullable=True),
        sa.Column("certificate_serial", sa.String(length=128), nullable=True),
        sa.Column("client_id", sa.String(length=128), nullable=True),
        sa.Column("qr_payload", sa.Text(), nullable=True),
        sa.Column(
            "process_type",
            sa.String(length=64),
            server_default="Kassenbeleg-V1",
            nullable=False,
        ),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["pos_order_id"], ["pos_order.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_pos_fiscal_process_pos_order_id",
        "pos_fiscal_process",
        ["pos_order_id"],
        unique=False,
    )
    op.create_index(
        "ix_pos_fiscal_process_order_kind",
        "pos_fiscal_process",
        ["pos_order_id", "kind"],
        unique=False,
    )
    op.create_index(
        "ix_pos_fiscal_process_order_state",
        "pos_fiscal_process",
        ["pos_order_id", "state"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_pos_fiscal_process_order_state", table_name="pos_fiscal_process")
    op.drop_index("ix_pos_fiscal_process_order_kind", table_name="pos_fiscal_process")
    op.drop_index("ix_pos_fiscal_process_pos_order_id", table_name="pos_fiscal_process")
    op.drop_table("pos_fiscal_process")
