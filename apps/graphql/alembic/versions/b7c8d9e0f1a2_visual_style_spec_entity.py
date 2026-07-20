"""visual_style_spec entity + visual_style.style_spec_id FK

Revision ID: b7c8d9e0f1a2
Revises: a6b7c8d9e0f1
Create Date: 2026-07-20

"""

from __future__ import annotations

import json
from collections.abc import Sequence
from typing import Any

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "b7c8d9e0f1a2"
down_revision: str | Sequence[str] | None = "a6b7c8d9e0f1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _legacy_spec_from_rules(rules: str) -> dict[str, Any]:
    text = (rules or "").strip()[:2000] or "Legacy style rules."
    return {
        "schemaVersion": 2,
        "properties": {
            "legacyRules": {
                "type": "text",
                "default": text,
                "instruction": "{{value}}",
            }
        },
    }


def upgrade() -> None:
    op.create_table(
        "visual_style_spec",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("workspace_id", sa.Integer(), nullable=False),
        sa.Column("created_by_clerk_user_id", sa.String(length=128), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column(
            "spec",
            postgresql.JSONB(astext_type=sa.Text()).with_variant(sa.JSON(), "sqlite"),
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
        sa.ForeignKeyConstraint(
            ["workspace_id"],
            ["workspace.id"],
            name=op.f("fk_visual_style_spec_workspace_id_workspace"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_visual_style_spec")),
    )
    op.create_index(
        op.f("ix_visual_style_spec_workspace_id"),
        "visual_style_spec",
        ["workspace_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_visual_style_spec_created_by_clerk_user_id"),
        "visual_style_spec",
        ["created_by_clerk_user_id"],
        unique=False,
    )

    op.add_column("visual_style", sa.Column("style_spec_id", sa.Integer(), nullable=True))

    conn = op.get_bind()
    spec_table = sa.table(
        "visual_style_spec",
        sa.column("id", sa.Integer),
        sa.column("workspace_id", sa.Integer),
        sa.column("created_by_clerk_user_id", sa.String),
        sa.column("name", sa.String),
        sa.column("spec", sa.JSON),
    )
    style_table = sa.table(
        "visual_style",
        sa.column("id", sa.Integer),
        sa.column("workspace_id", sa.Integer),
        sa.column("created_by_clerk_user_id", sa.String),
        sa.column("name", sa.String),
        sa.column("rules", sa.Text),
        sa.column("style_spec", sa.JSON),
        sa.column("style_spec_id", sa.Integer),
    )

    styles = conn.execute(
        sa.select(
            style_table.c.id,
            style_table.c.workspace_id,
            style_table.c.created_by_clerk_user_id,
            style_table.c.name,
            style_table.c.rules,
            style_table.c.style_spec,
        )
    ).mappings()

    for row in styles:
        raw_spec = row["style_spec"]
        if isinstance(raw_spec, str):
            try:
                raw_spec = json.loads(raw_spec)
            except json.JSONDecodeError:
                raw_spec = None
        if isinstance(raw_spec, dict) and raw_spec.get("schemaVersion") == 2:
            spec = raw_spec
        else:
            spec = _legacy_spec_from_rules(str(row["rules"] or ""))
        spec_name = f"{row['name']} Spec"[:128]

        result = conn.execute(
            sa.insert(spec_table)
            .values(
                workspace_id=row["workspace_id"],
                created_by_clerk_user_id=row["created_by_clerk_user_id"],
                name=spec_name,
                spec=spec,
            )
            .returning(spec_table.c.id)
        )
        spec_id = result.scalar_one()
        conn.execute(
            sa.update(style_table)
            .where(style_table.c.id == row["id"])
            .values(style_spec_id=spec_id)
        )

    op.alter_column("visual_style", "style_spec_id", existing_type=sa.Integer(), nullable=False)
    op.create_foreign_key(
        op.f("fk_visual_style_style_spec_id_visual_style_spec"),
        "visual_style",
        "visual_style_spec",
        ["style_spec_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_index(
        op.f("ix_visual_style_style_spec_id"),
        "visual_style",
        ["style_spec_id"],
        unique=False,
    )
    op.drop_column("visual_style", "style_spec")


def downgrade() -> None:
    op.add_column(
        "visual_style",
        sa.Column(
            "style_spec",
            postgresql.JSONB(astext_type=sa.Text()).with_variant(sa.JSON(), "sqlite"),
            nullable=True,
        ),
    )

    conn = op.get_bind()
    style_table = sa.table(
        "visual_style",
        sa.column("id", sa.Integer),
        sa.column("style_spec_id", sa.Integer),
        sa.column("style_spec", sa.JSON),
    )
    spec_table = sa.table(
        "visual_style_spec",
        sa.column("id", sa.Integer),
        sa.column("spec", sa.JSON),
    )
    rows = conn.execute(
        sa.select(style_table.c.id, spec_table.c.spec).join(
            spec_table, spec_table.c.id == style_table.c.style_spec_id
        )
    ).mappings()
    for row in rows:
        conn.execute(
            sa.update(style_table)
            .where(style_table.c.id == row["id"])
            .values(style_spec=row["spec"])
        )

    op.drop_constraint(
        op.f("fk_visual_style_style_spec_id_visual_style_spec"),
        "visual_style",
        type_="foreignkey",
    )
    op.drop_index(op.f("ix_visual_style_style_spec_id"), table_name="visual_style")
    op.drop_column("visual_style", "style_spec_id")
    op.drop_index(
        op.f("ix_visual_style_spec_created_by_clerk_user_id"),
        table_name="visual_style_spec",
    )
    op.drop_index(op.f("ix_visual_style_spec_workspace_id"), table_name="visual_style_spec")
    op.drop_table("visual_style_spec")
