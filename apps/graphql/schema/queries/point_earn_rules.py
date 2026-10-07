"""Query pointEarnRules for a location."""

from __future__ import annotations

import strawberry

from graphql.context import request_session_scope
from graphql.schema.auth import is_location_owner, user_id_from_info
from graphql.schema.types.point_earn_rule import PointEarnRuleType
from graphql.services.point_earn_rules import list_rules_for_location
from graphql.services.service_subscriptions import (
    SERVICE_KEY_POINT_SYSTEM,
    is_active_subscription,
)


def _rule_to_gql(action_key: str, points: int, enabled: bool) -> PointEarnRuleType:
    return PointEarnRuleType(action_key=action_key, points=points, enabled=enabled)


@strawberry.type
class PointEarnRulesQuery:
    @strawberry.field(
        description=(
            "Point earn rules for a location (full catalog merged with saved values). "
            "Requires ownership and an active point_system subscription; otherwise []."
        )
    )
    def point_earn_rules(
        self,
        info: strawberry.Info,
        location_id: int,
    ) -> list[PointEarnRuleType]:
        user_id = user_id_from_info(info)
        if not user_id:
            return []
        with request_session_scope(info) as session:
            if not is_location_owner(session, location_id, user_id, info=info):
                return []
            if not is_active_subscription(session, location_id, SERVICE_KEY_POINT_SYSTEM):
                return []
            views = list_rules_for_location(session, location_id)
            return [_rule_to_gql(v.action_key, v.points, v.enabled) for v in views]
