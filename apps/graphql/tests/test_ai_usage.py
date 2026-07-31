"""Tests for AI usage ledger mutation and personal summary query."""

from __future__ import annotations

import asyncio

from graphql.data_sources import SessionLocal
from graphql.data_sources.models.ai_usage_event import AiUsageEvent
from graphql.schema import schema
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context

RECORD_EVENT = """
mutation RecordAiUsageEvent(
  $provider: String!
  $feature: String!
  $status: String!
  $model: String
  $externalId: String
  $units: Int
) {
  recordAiUsageEvent(
    provider: $provider
    feature: $feature
    status: $status
    model: $model
    externalId: $externalId
    units: $units
  ) {
    id
    provider
    feature
    model
    externalId
    units
    status
  }
}
"""

SUMMARY_QUERY = """
query MyAiUsageSummary($startDate: String, $endDate: String) {
  myAiUsageSummary(startDate: $startDate, endDate: $endDate) {
    startDate
    endDate
    totalUnits
    buckets {
      provider
      feature
      model
      units
      eventCount
    }
    recentEvents {
      id
      feature
      units
    }
  }
}
"""


def _clear_events() -> None:
    session = SessionLocal()
    try:
        session.query(AiUsageEvent).delete()
        session.commit()
    finally:
        session.close()


def test_record_ai_usage_event_requires_auth() -> None:
    _clear_events()
    result = asyncio.run(
        schema.execute(
            RECORD_EVENT,
            variable_values={
                "provider": "leonardo",
                "feature": "post_generate",
                "status": "succeeded",
            },
            context_value={},
        )
    )
    assert result.errors
    assert "Missing authenticated user" in str(result.errors[0])


def test_record_and_summarize_ai_usage() -> None:
    _clear_events()
    create = asyncio.run(
        schema.execute(
            RECORD_EVENT,
            variable_values={
                "provider": "leonardo",
                "feature": "post_generate",
                "status": "succeeded",
                "model": "nano-banana-2",
                "externalId": "gen-123",
                "units": 1,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not create.errors, create.errors
    event = create.data["recordAiUsageEvent"]
    assert event["provider"] == "leonardo"
    assert event["feature"] == "post_generate"
    assert event["model"] == "nano-banana-2"
    assert event["externalId"] == "gen-123"
    assert event["units"] == 1
    assert event["status"] == "succeeded"

    llm = asyncio.run(
        schema.execute(
            RECORD_EVENT,
            variable_values={
                "provider": "ai_gateway",
                "feature": "chat",
                "status": "succeeded",
                "model": "openai/gpt-4o-mini",
                "units": 1,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not llm.errors, llm.errors

    # Other user's event must not appear
    session = SessionLocal()
    try:
        session.add(
            AiUsageEvent(
                user_id="other_user",
                provider="leonardo",
                feature="post_generate",
                model="nano-banana-2",
                units=5,
                status="succeeded",
            )
        )
        session.commit()
    finally:
        session.close()

    summary = asyncio.run(
        schema.execute(
            SUMMARY_QUERY,
            variable_values={},
            context_value=graphql_auth_context(),
        )
    )
    assert not summary.errors, summary.errors
    data = summary.data["myAiUsageSummary"]
    assert data["totalUnits"] == 2
    providers = {b["provider"] for b in data["buckets"]}
    assert providers == {"leonardo", "ai_gateway"}
    assert len(data["recentEvents"]) == 2

    # Ensure DB row is owned by test user
    session = SessionLocal()
    try:
        rows = (
            session.query(AiUsageEvent)
            .filter(AiUsageEvent.user_id == GRAPHQL_TEST_USER_ID)
            .all()
        )
        assert len(rows) == 2
    finally:
        session.close()


def test_record_rejects_bad_provider() -> None:
    _clear_events()
    result = asyncio.run(
        schema.execute(
            RECORD_EVENT,
            variable_values={
                "provider": "openai",
                "feature": "post_generate",
                "status": "succeeded",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors
    assert "Unsupported provider" in str(result.errors[0])
