"""GraphQL types for location-scoped point earn rules."""

import strawberry


@strawberry.type(description="Earn rule for one known Point System action at a location.")
class PointEarnRuleType:
    action_key: str
    points: int
    enabled: bool


@strawberry.input(description="Upsert payload for one point earn rule.")
class PointEarnRuleInput:
    action_key: str
    points: int
    enabled: bool
