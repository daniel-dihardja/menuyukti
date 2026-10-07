"""Upsert location-scoped point earn rules."""

from __future__ import annotations

import strawberry

from graphql.context import request_session_scope
from graphql.schema.auth import require_location_owner, user_id_from_info
from graphql.schema.types.point_earn_rule import PointEarnRuleInput, PointEarnRuleType
from graphql.services.point_earn_rules import PointEarnRuleUpsert, upsert_rules


@strawberry.type
class UpsertPointEarnRulesMutation:
    @strawberry.mutation(
        description=(
            "Create or update point earn rules for a location. "
            "Requires location ownership and an active point_system subscription."
        )
    )
    def upsert_point_earn_rules(
        self,
        info: strawberry.Info,
        location_id: int,
        rules: list[PointEarnRuleInput],
    ) -> list[PointEarnRuleType]:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for upsertPointEarnRules")
        with request_session_scope(info) as session:
            require_location_owner(session, location_id, user_id, info=info)
            views = upsert_rules(
                session,
                location_id=location_id,
                rules=[
                    PointEarnRuleUpsert(
                        action_key=rule.action_key,
                        points=rule.points,
                        enabled=rule.enabled,
                    )
                    for rule in rules
                ],
            )
            session.commit()
            return [
                PointEarnRuleType(
                    action_key=view.action_key,
                    points=view.points,
                    enabled=view.enabled,
                )
                for view in views
            ]
