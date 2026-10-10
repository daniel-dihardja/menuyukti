"""POS Phase 1 foundations: cents, tax, register, audit, fiscal seller fields

Revision ID: q0r1s2t3u4v5
Revises: p9q0r1s2t3u4
Create Date: 2026-10-10

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "q0r1s2t3u4v5"
down_revision: str | Sequence[str] | None = "p9q0r1s2t3u4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "tax_rate",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("code", sa.String(length=32), nullable=False),
        sa.Column("rate_bps", sa.Integer(), nullable=False),
        sa.Column("valid_from", sa.Date(), nullable=False),
        sa.Column("valid_to", sa.Date(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code", "valid_from", name="uq_tax_rate_code_valid_from"),
    )
    op.create_index("ix_tax_rate_code", "tax_rate", ["code"], unique=False)

    op.execute(
        sa.text(
            """
            INSERT INTO tax_rate (code, rate_bps, valid_from, valid_to)
            VALUES
              ('standard', 1900, '2020-01-01', NULL),
              ('reduced', 700, '2020-01-01', NULL)
            """
        )
    )

    op.add_column(
        "menu_item",
        sa.Column("tax_class", sa.String(length=32), server_default="standard", nullable=False),
    )

    op.add_column("location", sa.Column("legal_name", sa.String(length=256), nullable=True))
    op.add_column("location", sa.Column("tax_number", sa.String(length=64), nullable=True))
    op.add_column("location", sa.Column("vat_id", sa.String(length=64), nullable=True))

    op.create_table(
        "pos_register",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("location_id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("label", sa.String(length=128), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["location_id"], ["location.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("location_id", "code", name="uq_pos_register_location_code"),
    )
    op.create_index("ix_pos_register_location_id", "pos_register", ["location_id"], unique=False)

    op.create_table(
        "pos_bill_sequence",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("location_id", sa.Integer(), nullable=False),
        sa.Column("day_key", sa.String(length=8), nullable=False),
        sa.Column("next_seq", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["location_id"], ["location.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("location_id", "day_key", name="uq_pos_bill_sequence_location_day"),
    )
    op.create_index(
        "ix_pos_bill_sequence_location_id", "pos_bill_sequence", ["location_id"], unique=False
    )

    op.add_column("pos_order", sa.Column("register_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_pos_order_register_id",
        "pos_order",
        "pos_register",
        ["register_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_pos_order_register_id", "pos_order", ["register_id"], unique=False)

    op.add_column(
        "pos_order",
        sa.Column("discount_cents", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "pos_order",
        sa.Column("net_cents", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "pos_order",
        sa.Column("tax_cents", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "pos_order",
        sa.Column("gross_cents", sa.Integer(), server_default="0", nullable=False),
    )

    # Convert existing float euros → integer cents
    op.execute(
        sa.text(
            """
            UPDATE pos_order
            SET discount_cents = CAST(ROUND(COALESCE(discount_amount, 0) * 100) AS INTEGER)
            """
        )
    )
    op.drop_column("pos_order", "discount_amount")

    op.add_column(
        "pos_order_line",
        sa.Column("unit_price_cents", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "pos_order_line",
        sa.Column("tax_class_snapshot", sa.String(length=32), server_default="standard", nullable=False),
    )
    op.add_column(
        "pos_order_line",
        sa.Column("tax_rate_bps_snapshot", sa.Integer(), server_default="1900", nullable=False),
    )
    op.add_column(
        "pos_order_line",
        sa.Column("net_cents", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "pos_order_line",
        sa.Column("tax_cents", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "pos_order_line",
        sa.Column("gross_cents", sa.Integer(), server_default="0", nullable=False),
    )
    op.execute(
        sa.text(
            """
            UPDATE pos_order_line
            SET
              unit_price_cents = CAST(ROUND(unit_price * 100) AS INTEGER),
              gross_cents = CAST(ROUND(line_total * 100) AS INTEGER),
              net_cents = CAST(ROUND(line_total * 100 / 1.19) AS INTEGER),
              tax_cents = CAST(ROUND(line_total * 100) AS INTEGER)
                - CAST(ROUND(line_total * 100 / 1.19) AS INTEGER)
            """
        )
    )
    op.drop_column("pos_order_line", "unit_price")
    op.drop_column("pos_order_line", "line_total")
    op.alter_column("pos_order_line", "unit_price_cents", server_default=None)
    op.alter_column("pos_order_line", "gross_cents", server_default=None)

    op.add_column(
        "pos_order_line_modifier",
        sa.Column("price_delta_cents", sa.Integer(), server_default="0", nullable=False),
    )
    op.execute(
        sa.text(
            """
            UPDATE pos_order_line_modifier
            SET price_delta_cents = CAST(ROUND(COALESCE(price_delta_snapshot, 0) * 100) AS INTEGER)
            """
        )
    )
    op.drop_column("pos_order_line_modifier", "price_delta_snapshot")

    # Recompute order-level tax totals from lines − discount (best-effort for legacy rows)
    op.execute(
        sa.text(
            """
            UPDATE pos_order o
            SET
              gross_cents = GREATEST(
                0,
                COALESCE((
                  SELECT SUM(l.gross_cents) FROM pos_order_line l WHERE l.pos_order_id = o.id
                ), 0) - o.discount_cents
              ),
              net_cents = GREATEST(
                0,
                CAST(
                  ROUND(
                    (
                      COALESCE((
                        SELECT SUM(l.gross_cents) FROM pos_order_line l WHERE l.pos_order_id = o.id
                      ), 0) - o.discount_cents
                    ) / 1.19
                  ) AS INTEGER
                )
              ),
              tax_cents = GREATEST(
                0,
                COALESCE((
                  SELECT SUM(l.gross_cents) FROM pos_order_line l WHERE l.pos_order_id = o.id
                ), 0) - o.discount_cents
              ) - GREATEST(
                0,
                CAST(
                  ROUND(
                    (
                      COALESCE((
                        SELECT SUM(l.gross_cents) FROM pos_order_line l WHERE l.pos_order_id = o.id
                      ), 0) - o.discount_cents
                    ) / 1.19
                  ) AS INTEGER
                )
              )
            """
        )
    )

    json_type = postgresql.JSONB(astext_type=sa.Text()).with_variant(sa.JSON(), "sqlite")
    op.create_table(
        "pos_audit_event",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("location_id", sa.Integer(), nullable=False),
        sa.Column("pos_order_id", sa.Integer(), nullable=True),
        sa.Column("actor_clerk_user_id", sa.String(length=128), nullable=False),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column("payload", json_type, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["location_id"], ["location.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["pos_order_id"], ["pos_order.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_pos_audit_event_location_created",
        "pos_audit_event",
        ["location_id", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_pos_audit_event_order_created",
        "pos_audit_event",
        ["pos_order_id", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_pos_audit_event_order_created", table_name="pos_audit_event")
    op.drop_index("ix_pos_audit_event_location_created", table_name="pos_audit_event")
    op.drop_table("pos_audit_event")

    op.add_column(
        "pos_order_line_modifier",
        sa.Column("price_delta_snapshot", sa.Float(), server_default="0", nullable=False),
    )
    op.execute(
        sa.text(
            """
            UPDATE pos_order_line_modifier
            SET price_delta_snapshot = price_delta_cents / 100.0
            """
        )
    )
    op.drop_column("pos_order_line_modifier", "price_delta_cents")

    op.add_column("pos_order_line", sa.Column("unit_price", sa.Float(), nullable=False, server_default="0"))
    op.add_column("pos_order_line", sa.Column("line_total", sa.Float(), nullable=False, server_default="0"))
    op.execute(
        sa.text(
            """
            UPDATE pos_order_line
            SET
              unit_price = unit_price_cents / 100.0,
              line_total = gross_cents / 100.0
            """
        )
    )
    op.drop_column("pos_order_line", "gross_cents")
    op.drop_column("pos_order_line", "tax_cents")
    op.drop_column("pos_order_line", "net_cents")
    op.drop_column("pos_order_line", "tax_rate_bps_snapshot")
    op.drop_column("pos_order_line", "tax_class_snapshot")
    op.drop_column("pos_order_line", "unit_price_cents")

    op.add_column(
        "pos_order",
        sa.Column("discount_amount", sa.Float(), server_default="0", nullable=False),
    )
    op.execute(
        sa.text("UPDATE pos_order SET discount_amount = discount_cents / 100.0")
    )
    op.drop_column("pos_order", "gross_cents")
    op.drop_column("pos_order", "tax_cents")
    op.drop_column("pos_order", "net_cents")
    op.drop_column("pos_order", "discount_cents")
    op.drop_index("ix_pos_order_register_id", table_name="pos_order")
    op.drop_constraint("fk_pos_order_register_id", "pos_order", type_="foreignkey")
    op.drop_column("pos_order", "register_id")

    op.drop_index("ix_pos_bill_sequence_location_id", table_name="pos_bill_sequence")
    op.drop_table("pos_bill_sequence")
    op.drop_index("ix_pos_register_location_id", table_name="pos_register")
    op.drop_table("pos_register")

    op.drop_column("location", "vat_id")
    op.drop_column("location", "tax_number")
    op.drop_column("location", "legal_name")
    op.drop_column("menu_item", "tax_class")

    op.drop_index("ix_tax_rate_code", table_name="tax_rate")
    op.drop_table("tax_rate")
