"""Query personal AI usage summary for the authenticated user."""

from __future__ import annotations

import re
from collections import defaultdict
from datetime import UTC, datetime, timedelta

import strawberry
from sqlalchemy import and_

from graphql.context import request_session_scope
from graphql.data_sources.models.ai_usage_event import AiUsageEvent
from graphql.schema.auth import user_id_from_info
from graphql.schema.types.ai_usage import (
    AiUsageBucketType,
    AiUsageEventType,
    AiUsageSummaryType,
)

_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_RECENT_LIMIT = 25


def _parse_ymd(value: str, *, end_of_day: bool) -> datetime:
    clean = value.strip()
    if not _DATE_RE.match(clean):
        raise ValueError("Dates must be YYYY-MM-DD")
    year, month, day = (int(p) for p in clean.split("-"))
    if end_of_day:
        return datetime(year, month, day, 23, 59, 59, 999999, tzinfo=UTC)
    return datetime(year, month, day, 0, 0, 0, 0, tzinfo=UTC)


def _event_to_gql(row: AiUsageEvent) -> AiUsageEventType:
    created = row.created_at.isoformat() if row.created_at else ""
    return AiUsageEventType(
        id=str(row.id),
        provider=row.provider,
        feature=row.feature,
        model=row.model,
        external_id=row.external_id,
        units=row.units,
        status=row.status,
        created_at=created,
    )


def _meta_int(meta: dict[str, object] | None, key: str) -> int:
    if not meta:
        return 0
    raw = meta.get(key)
    if isinstance(raw, bool):
        return 0
    if isinstance(raw, int):
        return max(0, raw)
    if isinstance(raw, float):
        return max(0, int(raw))
    if isinstance(raw, str) and raw.isdigit():
        return int(raw)
    return 0


@strawberry.type
class AiUsageQuery:
    @strawberry.field(
        description=(
            "Aggregated AI usage for the authenticated user in [startDate, endDate] (UTC dates)."
        )
    )
    def my_ai_usage_summary(
        self,
        info: strawberry.Info,
        start_date: str | None = None,
        end_date: str | None = None,
    ) -> AiUsageSummaryType | None:
        user_id = user_id_from_info(info)
        if not user_id:
            return None

        end = end_date.strip() if isinstance(end_date, str) and end_date.strip() else None
        start = start_date.strip() if isinstance(start_date, str) and start_date.strip() else None

        if end is None:
            end_dt = datetime.now(UTC)
            end = end_dt.strftime("%Y-%m-%d")
        else:
            end_dt = _parse_ymd(end, end_of_day=True)

        if start is None:
            start_dt = end_dt - timedelta(days=30)
            start = start_dt.strftime("%Y-%m-%d")
            start_dt = _parse_ymd(start, end_of_day=False)
        else:
            start_dt = _parse_ymd(start, end_of_day=False)

        if start_dt > end_dt:
            raise ValueError("startDate must be on or before endDate")

        with request_session_scope(info) as session:
            rows = (
                session.query(AiUsageEvent)
                .filter(
                    and_(
                        AiUsageEvent.user_id == user_id,
                        AiUsageEvent.created_at >= start_dt,
                        AiUsageEvent.created_at <= end_dt,
                    )
                )
                .order_by(AiUsageEvent.created_at.desc())
                .all()
            )

        # units, event_count, input_tokens, output_tokens
        buckets_map: dict[tuple[str, str, str | None], list[int]] = defaultdict(
            lambda: [0, 0, 0, 0]
        )
        for row in rows:
            key = (row.provider, row.feature, row.model)
            buckets_map[key][0] += row.units
            buckets_map[key][1] += 1
            meta = row.event_metadata if isinstance(row.event_metadata, dict) else None
            buckets_map[key][2] += _meta_int(meta, "input_tokens")
            buckets_map[key][3] += _meta_int(meta, "output_tokens")

        buckets = [
            AiUsageBucketType(
                provider=provider,
                feature=feature,
                model=model,
                units=vals[0],
                event_count=vals[1],
                input_tokens=vals[2],
                output_tokens=vals[3],
            )
            for (provider, feature, model), vals in sorted(
                buckets_map.items(),
                key=lambda item: (-item[1][0], item[0][0], item[0][1]),
            )
        ]
        total_units = sum(b.units for b in buckets)
        recent = [_event_to_gql(r) for r in rows[:_RECENT_LIMIT]]

        return AiUsageSummaryType(
            start_date=start,
            end_date=end,
            buckets=buckets,
            total_units=total_units,
            recent_events=recent,
        )
