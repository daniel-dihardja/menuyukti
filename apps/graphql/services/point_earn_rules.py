"""Location-scoped point earn rule catalog and persistence."""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.orm import Session

from graphql.data_sources.models.point_earn_rule import PointEarnRule
from graphql.services.service_subscriptions import (
    SERVICE_KEY_POINT_SYSTEM,
    is_active_subscription,
)

ACTION_KEY_OPEN_MENU_QR = "open_menu_qr"
ACTION_KEY_COMPLETE_ORDER = "complete_order"


@dataclass(frozen=True, slots=True)
class PointEarnActionCatalogEntry:
    action_key: str
    default_points: int
    default_enabled: bool


KNOWN_POINT_EARN_ACTIONS: tuple[PointEarnActionCatalogEntry, ...] = (
    PointEarnActionCatalogEntry(
        action_key=ACTION_KEY_OPEN_MENU_QR,
        default_points=10,
        default_enabled=False,
    ),
    PointEarnActionCatalogEntry(
        action_key=ACTION_KEY_COMPLETE_ORDER,
        default_points=0,
        default_enabled=False,
    ),
)

KNOWN_POINT_EARN_ACTION_KEYS = frozenset(entry.action_key for entry in KNOWN_POINT_EARN_ACTIONS)


@dataclass(frozen=True, slots=True)
class PointEarnRuleView:
    action_key: str
    points: int
    enabled: bool


@dataclass(frozen=True, slots=True)
class PointEarnRuleUpsert:
    action_key: str
    points: int
    enabled: bool


def normalize_action_key(action_key: str | None) -> str:
    value = (action_key or "").strip().lower()
    if value not in KNOWN_POINT_EARN_ACTION_KEYS:
        raise ValueError(
            f"Invalid point earn action key: {action_key!r}. "
            f"Expected one of {sorted(KNOWN_POINT_EARN_ACTION_KEYS)}."
        )
    return value


def require_active_point_system(session: Session, location_id: int) -> None:
    if not is_active_subscription(session, location_id, SERVICE_KEY_POINT_SYSTEM):
        raise ValueError("point_system subscription is required for this location")


def list_rules_for_location(session: Session, location_id: int) -> list[PointEarnRuleView]:
    rows = session.query(PointEarnRule).filter(PointEarnRule.location_id == location_id).all()
    by_key = {row.action_key: row for row in rows}
    result: list[PointEarnRuleView] = []
    for entry in KNOWN_POINT_EARN_ACTIONS:
        row = by_key.get(entry.action_key)
        if row is None:
            result.append(
                PointEarnRuleView(
                    action_key=entry.action_key,
                    points=entry.default_points,
                    enabled=entry.default_enabled,
                )
            )
        else:
            result.append(
                PointEarnRuleView(
                    action_key=row.action_key,
                    points=row.points,
                    enabled=row.enabled,
                )
            )
    return result


def upsert_rules(
    session: Session,
    *,
    location_id: int,
    rules: list[PointEarnRuleUpsert],
) -> list[PointEarnRuleView]:
    require_active_point_system(session, location_id)

    if not rules:
        raise ValueError("At least one point earn rule is required")

    seen: set[str] = set()
    normalized: list[PointEarnRuleUpsert] = []
    for rule in rules:
        key = normalize_action_key(rule.action_key)
        if key in seen:
            raise ValueError(f"Duplicate point earn action key: {key!r}")
        seen.add(key)
        if not isinstance(rule.points, int) or rule.points < 0:
            raise ValueError(f"points must be a non-negative integer for action {key!r}")
        normalized.append(
            PointEarnRuleUpsert(action_key=key, points=rule.points, enabled=bool(rule.enabled))
        )

    existing = (
        session.query(PointEarnRule)
        .filter(
            PointEarnRule.location_id == location_id,
            PointEarnRule.action_key.in_([r.action_key for r in normalized]),
        )
        .all()
    )
    by_key = {row.action_key: row for row in existing}

    for rule in normalized:
        row = by_key.get(rule.action_key)
        if row is None:
            session.add(
                PointEarnRule(
                    location_id=location_id,
                    action_key=rule.action_key,
                    points=rule.points,
                    enabled=rule.enabled,
                )
            )
        else:
            row.points = rule.points
            row.enabled = rule.enabled

    session.flush()
    return list_rules_for_location(session, location_id)
