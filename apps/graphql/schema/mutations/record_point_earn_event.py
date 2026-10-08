"""Guest mutation: record a point-earn event (open_menu_qr)."""

from __future__ import annotations

import strawberry

import graphql.services.point_ledger as ledger_svc
from graphql.context import request_session_scope
from graphql.data_sources import Location
from graphql.schema.auth import user_id_from_info
from graphql.schema.types.point_ledger import RecordPointEarnEventResultType


@strawberry.type
class RecordPointEarnEventMutation:
    @strawberry.mutation(
        description=(
            "Authenticated guest: record a Point System earn event for a location. "
            "Currently supports open_menu_qr (idempotent once per UTC day). "
            "No-ops when Point System is off or the rule is disabled."
        )
    )
    def record_point_earn_event(
        self,
        info: strawberry.Info,
        location_id: int,
        action_key: str,
    ) -> RecordPointEarnEventResultType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for recordPointEarnEvent")

        key = ledger_svc.require_guest_earn_action_key(action_key)

        with request_session_scope(info) as session:
            loc = session.get(Location, location_id)
            if loc is None:
                raise ValueError("Location not found")

            if key == ledger_svc.ACTION_KEY_OPEN_MENU_QR:
                result = ledger_svc.award_for_menu_open(
                    session,
                    clerk_user_id=user_id,
                    location_id=location_id,
                )
            else:
                raise ValueError(f"Unsupported earn action: {action_key!r}")

            session.commit()
            return RecordPointEarnEventResultType(
                awarded=result.awarded,
                balance=result.balance,
            )
