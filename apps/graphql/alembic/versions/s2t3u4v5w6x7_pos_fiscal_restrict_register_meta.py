"""POS fiscal FK RESTRICT + register TSE metadata columns

Revision ID: s2t3u4v5w6x7
Revises: r1s2t3u4v5w6
Create Date: 2026-10-12

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "s2t3u4v5w6x7"
down_revision: str | Sequence[str] | None = "r1s2t3u4v5w6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _drop_pos_order_fks() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    for fk in inspector.get_foreign_keys("pos_fiscal_process"):
        if fk.get("referred_table") == "pos_order" and fk.get("name"):
            op.drop_constraint(fk["name"], "pos_fiscal_process", type_="foreignkey")


def upgrade() -> None:
    op.add_column(
        "pos_register",
        sa.Column("tse_client_id", sa.String(length=128), nullable=True),
    )
    op.add_column(
        "pos_register",
        sa.Column("certificate_serial", sa.String(length=128), nullable=True),
    )
    op.add_column(
        "pos_register",
        sa.Column("external_tss_id", sa.String(length=128), nullable=True),
    )

    # Recreate FK without CASCADE so finished fiscal rows cannot be wiped with the order.
    _drop_pos_order_fks()
    op.create_foreign_key(
        "pos_fiscal_process_pos_order_id_fkey",
        "pos_fiscal_process",
        "pos_order",
        ["pos_order_id"],
        ["id"],
        ondelete="RESTRICT",
    )


def downgrade() -> None:
    _drop_pos_order_fks()
    op.create_foreign_key(
        "pos_fiscal_process_pos_order_id_fkey",
        "pos_fiscal_process",
        "pos_order",
        ["pos_order_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.drop_column("pos_register", "external_tss_id")
    op.drop_column("pos_register", "certificate_serial")
    op.drop_column("pos_register", "tse_client_id")
