"""rename service_subscription.service_key prediction → pick_and_win

Revision ID: m6n7o8p9q0r1
Revises: l5m6n7o8p9q0
Create Date: 2026-10-08

"""

from collections.abc import Sequence

from alembic import op

revision: str = "m6n7o8p9q0r1"
down_revision: str | Sequence[str] | None = "l5m6n7o8p9q0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        "UPDATE service_subscription SET service_key = 'pick_and_win' "
        "WHERE service_key = 'prediction'"
    )


def downgrade() -> None:
    op.execute(
        "UPDATE service_subscription SET service_key = 'prediction' "
        "WHERE service_key = 'pick_and_win'"
    )
