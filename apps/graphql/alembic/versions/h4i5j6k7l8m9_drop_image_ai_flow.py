"""drop image_ai_flow table

Revision ID: h4i5j6k7l8m9
Revises: g3h4i5j6k7l8
Create Date: 2026-09-05

"""

from collections.abc import Sequence

from alembic import op

revision: str = "h4i5j6k7l8m9"
down_revision: str | Sequence[str] | None = "g3h4i5j6k7l8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_index(op.f("ix_image_ai_flow_slug"), table_name="image_ai_flow")
    op.drop_table("image_ai_flow")


def downgrade() -> None:
    # Table was introduced in initial_schema; recreate minimal columns if rolling back.
    import sqlalchemy as sa

    op.create_table(
        "image_ai_flow",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("slug", sa.String(length=128), nullable=False),
        sa.Column("display_name", sa.String(length=256), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("model", sa.String(length=128), nullable=False),
        sa.Column("prompt_enhance", sa.String(length=64), nullable=True),
        sa.Column("image_reference_strength", sa.String(length=64), nullable=True),
        sa.Column("style_ids", sa.JSON(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_image_ai_flow_slug"), "image_ai_flow", ["slug"], unique=True)
