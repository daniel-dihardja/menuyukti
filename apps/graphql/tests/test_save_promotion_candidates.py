"""Tests for savePromotionCandidates mutation."""

import asyncio

from graphql.data_sources import Campaign, Location, PromotionCandidates, SessionLocal
from graphql.schema import schema
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context

MUTATION = """
mutation SavePromotionCandidates($campaignId: ID!, $candidatesJson: JSON!) {
  savePromotionCandidates(campaignId: $campaignId, candidatesJson: $candidatesJson) {
    id
    campaignId
    candidatesJson
    createdAt
    updatedAt
  }
}
"""


def _create_campaign() -> int:
    session = SessionLocal()
    try:
        loc = Location(name="Promotion candidates test loc", clerk_user_id=GRAPHQL_TEST_USER_ID)
        session.add(loc)
        session.commit()
        session.refresh(loc)
        camp = Campaign(
            location_id=loc.id,
            name="Test campaign",
            status="draft",
        )
        session.add(camp)
        session.commit()
        session.refresh(camp)
        cid = camp.id
    finally:
        session.close()
    return cid


def _cleanup_campaign(campaign_id: int) -> None:
    session = SessionLocal()
    try:
        session.query(PromotionCandidates).filter(
            PromotionCandidates.campaign_id == campaign_id
        ).delete()
        camp = session.get(Campaign, campaign_id)
        if camp is not None:
            lid = camp.location_id
            session.delete(camp)
            session.query(Location).filter(Location.id == lid).delete()
        session.commit()
    finally:
        session.close()


def test_save_promotion_candidates_creates_and_updates():
    campaign_id = _create_campaign()
    try:
        payload_v1 = {"items": [{"menu": "Burger", "category": "star"}]}
        result = asyncio.run(
            schema.execute(
                MUTATION,
                variable_values={
                    "campaignId": str(campaign_id),
                    "candidatesJson": payload_v1,
                },
                context_value=graphql_auth_context(),
            )
        )
        assert not result.errors, result.errors
        data = result.data["savePromotionCandidates"]
        assert data["campaignId"] == campaign_id
        assert data["candidatesJson"] == payload_v1

        payload_v2 = {"items": [{"menu": "Salad", "category": "puzzle"}]}
        result2 = asyncio.run(
            schema.execute(
                MUTATION,
                variable_values={
                    "campaignId": str(campaign_id),
                    "candidatesJson": payload_v2,
                },
                context_value=graphql_auth_context(),
            )
        )
        assert not result2.errors, result2.errors
        data2 = result2.data["savePromotionCandidates"]
        assert data2["id"] == data["id"]
        assert data2["candidatesJson"] == payload_v2

        session = SessionLocal()
        try:
            row = (
                session.query(PromotionCandidates)
                .filter(PromotionCandidates.campaign_id == campaign_id)
                .one()
            )
            assert row.candidates_json == payload_v2
        finally:
            session.close()
    finally:
        _cleanup_campaign(campaign_id)


def test_save_promotion_candidates_denied_without_owner():
    campaign_id = _create_campaign()
    try:
        result = asyncio.run(
            schema.execute(
                MUTATION,
                variable_values={
                    "campaignId": str(campaign_id),
                    "candidatesJson": {},
                },
                context_value={"user_id": ""},
            )
        )
        assert result.errors
        assert "Access denied" in str(result.errors[0].message) or "PermissionError" in str(
            result.errors
        )
    finally:
        _cleanup_campaign(campaign_id)
