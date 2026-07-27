import asyncio
from datetime import UTC, datetime

from graphql.data_sources import (
    InstagramPost,
    InstagramPostPage,
    InstagramPostPageMediaVersion,
    SessionLocal,
    Workspace,
    WorkspaceMembership,
)
from graphql.schema import schema
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context

OWNER_ID = GRAPHQL_TEST_USER_ID
MEMBER_ID = "clerk_test_member"

CREATE_POST = """
mutation CreatePost($title: String) {
  createPost(title: $title) {
    id
    workspaceId
    pages { id }
  }
}
"""

UPDATE_POST_PAGE = """
mutation UpdatePostPage($id: ID!, $mediaS3Key: String) {
  updatePostPage(id: $id, mediaS3Key: $mediaS3Key) {
    id
    mediaS3Key
  }
}
"""


def _auth(user_id: str) -> dict[str, str]:
    return {"user_id": user_id}


def _seed_workspace_with_member() -> int:
    session = SessionLocal()
    try:
        session.query(InstagramPostPageMediaVersion).delete()
        session.query(InstagramPostPage).delete()
        session.query(InstagramPost).delete()
        session.query(WorkspaceMembership).delete()
        session.query(Workspace).delete()
        session.commit()

        now = datetime.now(tz=UTC)
        ws = Workspace(name="Shared media workspace", owner_clerk_user_id=OWNER_ID)
        session.add(ws)
        session.flush()
        session.add(
            WorkspaceMembership(
                workspace_id=ws.id,
                clerk_user_id=OWNER_ID,
                role="owner",
                invited_at=now,
                accepted_at=now,
            )
        )
        session.add(
            WorkspaceMembership(
                workspace_id=ws.id,
                clerk_user_id=MEMBER_ID,
                role="member",
                invited_at=now,
                accepted_at=now,
            )
        )
        session.commit()
        session.refresh(ws)
        return ws.id
    finally:
        session.close()


def test_member_can_set_workspace_and_legacy_owner_media_keys():
    workspace_id = _seed_workspace_with_member()
    filename = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.webp"
    workspace_key = f"workspaces/{workspace_id}/posts/{filename}"
    legacy_key = f"users/{OWNER_ID}/posts/bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee.webp"

    create_result = asyncio.run(
        schema.execute(
            CREATE_POST,
            variable_values={"title": "Shared draft"},
            context_value=_auth(OWNER_ID),
        )
    )
    assert not create_result.errors, create_result.errors
    page_id = create_result.data["createPost"]["pages"][0]["id"]

    workspace_update = asyncio.run(
        schema.execute(
            UPDATE_POST_PAGE,
            variable_values={"id": page_id, "mediaS3Key": workspace_key},
            context_value=_auth(MEMBER_ID),
        )
    )
    assert not workspace_update.errors, workspace_update.errors
    assert workspace_update.data["updatePostPage"]["mediaS3Key"] == workspace_key

    legacy_update = asyncio.run(
        schema.execute(
            UPDATE_POST_PAGE,
            variable_values={"id": page_id, "mediaS3Key": legacy_key},
            context_value=_auth(MEMBER_ID),
        )
    )
    assert not legacy_update.errors, legacy_update.errors
    assert legacy_update.data["updatePostPage"]["mediaS3Key"] == legacy_key


def test_outsider_cannot_update_post_media_key():
    _seed_workspace_with_member()
    create_result = asyncio.run(
        schema.execute(
            CREATE_POST,
            variable_values={"title": "Owner draft"},
            context_value=graphql_auth_context(),
        )
    )
    assert not create_result.errors, create_result.errors
    page_id = create_result.data["createPost"]["pages"][0]["id"]
    filename = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.webp"

    result = asyncio.run(
        schema.execute(
            UPDATE_POST_PAGE,
            variable_values={
                "id": page_id,
                "mediaS3Key": f"users/{OWNER_ID}/posts/{filename}",
            },
            context_value=_auth("clerk_outsider"),
        )
    )
    assert result.errors is not None
