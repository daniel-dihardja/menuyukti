"""GraphQL types for personal AI usage metering."""

from __future__ import annotations

import strawberry


@strawberry.type(description="One recorded AI usage event for the authenticated user.")
class AiUsageEventType:
    id: str
    provider: str
    feature: str
    model: str | None
    external_id: str | None
    units: int
    status: str
    created_at: str


@strawberry.type(description="Aggregated usage for one provider+feature+model bucket.")
class AiUsageBucketType:
    provider: str
    feature: str
    model: str | None
    units: int
    event_count: int
    input_tokens: int = 0
    output_tokens: int = 0


@strawberry.type(description="Personal AI usage summary for a date range.")
class AiUsageSummaryType:
    start_date: str
    end_date: str
    buckets: list[AiUsageBucketType]
    total_units: int
    recent_events: list[AiUsageEventType]
