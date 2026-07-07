"""Posts query and createPost mutation."""

import asyncio
from datetime import UTC, datetime

from graphql.data_sources import InstagramPost, SessionLocal, Workspace, WorkspaceMembership
from graphql.schema import schema
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context

POSTS_QUERY = """
query Posts($first: Int) {
  posts(first: $first) {
    id
    title
    status
    workspaceId
    locationId
    createdAt
    updatedAt
  }
}
"""

CREATE_POST = """
mutation CreatePost($title: String) {
  createPost(title: $title) {
    id
    title
    status
    workspaceId
    locationId
  }
}
"""

OTHER_USER_ID = "clerk_other_user"


def _seed_workspace(*, owner_id: str = GRAPHQL_TEST_USER_ID) -> int:
    session = SessionLocal()
    try:
        session.query(InstagramPost).delete()
        session.query(WorkspaceMembership).delete()
        session.query(Workspace).delete()
        session.commit()

        now = datetime.now(tz=UTC)
        ws = Workspace(name="Posts workspace", owner_clerk_user_id=owner_id)
        session.add(ws)
        session.flush()
        session.add(
            WorkspaceMembership(
                workspace_id=ws.id,
                clerk_user_id=owner_id,
                role="owner",
                invited_at=now,
                accepted_at=now,
            )
        )
        session.commit()
        session.refresh(ws)
        return ws.id
    finally:
        session.close()


def test_posts_returns_empty_without_auth():
    result = schema.execute_sync(POSTS_QUERY)
    assert result.errors is None
    assert result.data is not None
    assert result.data["posts"] == []


def test_create_post_requires_auth():
    result = schema.execute_sync(CREATE_POST, variable_values={"title": "Hello"})
    assert result.errors is not None


def test_create_post_and_list_posts():
    workspace_id = _seed_workspace()

    create_result = asyncio.run(
        schema.execute(
            CREATE_POST,
            variable_values={"title": "Summer special"},
            context_value=graphql_auth_context(),
        )
    )
    assert not create_result.errors, create_result.errors
    created = create_result.data["createPost"]
    assert created["title"] == "Summer special"
    assert created["status"] == "draft"
    assert created["locationId"] is None
    assert created["workspaceId"] == str(workspace_id)

    list_result = asyncio.run(schema.execute(POSTS_QUERY, context_value=graphql_auth_context()))
    assert not list_result.errors, list_result.errors
    posts = list_result.data["posts"]
    assert len(posts) == 1
    assert posts[0]["id"] == created["id"]
    assert posts[0]["title"] == "Summer special"


def test_posts_hidden_from_other_workspace_user():
    workspace_id = _seed_workspace()
    session = SessionLocal()
    try:
        session.add(
            InstagramPost(
                workspace_id=workspace_id,
                title="Owner draft",
                status="draft",
                created_by_clerk_user_id=GRAPHQL_TEST_USER_ID,
            )
        )
        session.commit()
    finally:
        session.close()

    result = asyncio.run(schema.execute(POSTS_QUERY, context_value={"user_id": OTHER_USER_ID}))
    assert not result.errors, result.errors
    assert result.data["posts"] == []
