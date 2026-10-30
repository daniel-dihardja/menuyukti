"""Knowledge ingest + semantic search (SQLite-friendly, mocked embeddings)."""

from __future__ import annotations

from pathlib import Path

import pytest

from graphql.data_sources import (
    KnowledgeChunk,
    KnowledgeDocument,
    KnowledgeEmbedding,
    Location,
    SessionLocal,
    Workspace,
    WorkspaceMembership,
)
from graphql.services.knowledge_embeddings import StaticEmbedder
from graphql.services.knowledge_ingest import (
    KnowledgeSeedSpec,
    clear_knowledge_corpus,
    ingest_seed_directory,
    upsert_knowledge_document,
)
from graphql.services.knowledge_search import cosine_similarity, search_knowledge

SEED_DIR = Path(__file__).resolve().parents[1] / "knowledge"
USER_A = "user-knowledge-a"
USER_B = "user-knowledge-b"


@pytest.fixture
def knowledge_session():
    session = SessionLocal()
    try:
        session.query(KnowledgeEmbedding).delete()
        session.query(KnowledgeChunk).delete()
        session.query(KnowledgeDocument).delete()
        session.query(WorkspaceMembership).delete()
        session.query(Location).delete()
        session.query(Workspace).delete()
        session.commit()
        yield session
    finally:
        session.rollback()
        session.close()


def test_cosine_similarity_identical() -> None:
    v = [1.0, 0.0, 0.0]
    assert cosine_similarity(v, v) == pytest.approx(1.0)


def test_ingest_seed_directory_and_search(knowledge_session) -> None:
    embedder = StaticEmbedder(dims=32)
    results = ingest_seed_directory(
        knowledge_session, SEED_DIR, embedder=embedder, force=True
    )
    knowledge_session.commit()
    assert results
    assert all(r.chunk_count >= 1 for r in results)
    assert knowledge_session.query(KnowledgeDocument).count() >= 3

    hits = search_knowledge(
        knowledge_session,
        query="what is pair lift and how do I use combo offers",
        user_id=USER_A,
        categories=["kpi"],
        limit=5,
        embedder=embedder,
    )
    assert hits
    assert any("lift" in h.title.lower() or "lift" in h.content.lower() for h in hits)
    assert all(h.scope_type == "global" for h in hits)
    assert all(h.category == "kpi" for h in hits)


def test_search_skips_unauthenticated_empty_user(knowledge_session) -> None:
    embedder = StaticEmbedder(dims=32)
    upsert_knowledge_document(
        knowledge_session,
        KnowledgeSeedSpec(
            slug="test-kpi",
            title="Test KPI",
            category="kpi",
            body="# Test\n\nLift explains co-purchase strength.\n",
            status="published",
        ),
        embedder=embedder,
        force=True,
    )
    knowledge_session.commit()
    assert search_knowledge(
        knowledge_session, query="lift", user_id="", embedder=embedder
    ) == []


def test_location_scoped_doc_not_leaked_across_tenants(knowledge_session) -> None:
    embedder = StaticEmbedder(dims=32)
    # Two solo locations / owners
    loc_a = Location(name="A", clerk_user_id=USER_A)
    loc_b = Location(name="B", clerk_user_id=USER_B)
    knowledge_session.add_all([loc_a, loc_b])
    knowledge_session.flush()

    upsert_knowledge_document(
        knowledge_session,
        KnowledgeSeedSpec(
            slug="global-domain",
            title="Global domain",
            category="domain",
            body="# Global\n\nShared hospitality guidance for all operators.\n",
            scope_type="global",
            status="published",
        ),
        embedder=embedder,
        force=True,
    )
    # Bypass MVP global-only guard by writing location scope directly after upsert helper check —
    # use model insert for tenant isolation fixture.
    secret = KnowledgeDocument(
        slug="loc-a-secret",
        title="Location A secret playbook",
        category="playbook",
        scope_type="location",
        location_id=loc_a.id,
        status="published",
        version=1,
        content_hash="x",
        body="# Secret\n\nOnly venue A should retrieve this unique asparagus tip.\n",
    )
    knowledge_session.add(secret)
    knowledge_session.flush()
    from graphql.data_sources.models.knowledge import KnowledgeChunk, KnowledgeEmbedding

    chunk = KnowledgeChunk(
        document_id=secret.id,
        chunk_index=0,
        content=secret.body,
        token_count=20,
    )
    knowledge_session.add(chunk)
    knowledge_session.flush()
    vec = embedder.embed_texts([secret.body])[0]
    knowledge_session.add(
        KnowledgeEmbedding(chunk_id=chunk.id, embedding=vec, embedding_model="static")
    )
    knowledge_session.commit()

    hits_b = search_knowledge(
        knowledge_session,
        query="asparagus tip venue secret",
        user_id=USER_B,
        limit=10,
        embedder=embedder,
    )
    assert all(h.slug != "loc-a-secret" for h in hits_b)

    hits_a = search_knowledge(
        knowledge_session,
        query="asparagus tip venue secret",
        user_id=USER_A,
        location_id=loc_a.id,
        limit=10,
        embedder=embedder,
    )
    assert any(h.slug == "loc-a-secret" for h in hits_a)


def test_ingest_skips_unchanged_hash(knowledge_session) -> None:
    embedder = StaticEmbedder(dims=16)
    spec = KnowledgeSeedSpec(
        slug="skip-me",
        title="Skip",
        category="domain",
        body="# Once\n\nStable body for hash skip.\n",
    )
    first = upsert_knowledge_document(knowledge_session, spec, embedder=embedder)
    knowledge_session.commit()
    second = upsert_knowledge_document(knowledge_session, spec, embedder=embedder)
    assert first.skipped is False
    assert second.skipped is True
    assert second.version == first.version


def test_clear_knowledge_corpus(knowledge_session) -> None:
    embedder = StaticEmbedder(dims=16)
    upsert_knowledge_document(
        knowledge_session,
        KnowledgeSeedSpec(
            slug="clear-me",
            title="Clear me",
            category="domain",
            body="# Wipe\n\nThis should disappear on clear.\n",
        ),
        embedder=embedder,
    )
    knowledge_session.commit()
    assert knowledge_session.query(KnowledgeDocument).count() == 1
    assert knowledge_session.query(KnowledgeChunk).count() >= 1
    assert knowledge_session.query(KnowledgeEmbedding).count() >= 1

    result = clear_knowledge_corpus(knowledge_session)
    knowledge_session.commit()
    assert result.documents == 1
    assert result.chunks >= 1
    assert result.embeddings >= 1
    assert knowledge_session.query(KnowledgeDocument).count() == 0
    assert knowledge_session.query(KnowledgeChunk).count() == 0
    assert knowledge_session.query(KnowledgeEmbedding).count() == 0
