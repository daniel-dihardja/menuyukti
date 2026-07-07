"""Posts query and createPost mutation."""

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
    pages {
      id
      sortOrder
      mediaS3Key
      prompt
    }
  }
}
"""

POST_QUERY = """
query Post($id: ID!) {
  post(id: $id) {
    id
    title
    status
    workspaceId
    pages {
      id
      sortOrder
      mediaS3Key
      prompt
      mediaVersions {
        id
        mediaS3Key
        prompt
        createdAt
      }
    }
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
    pages {
      id
      sortOrder
    }
  }
}
"""

DELETE_POST = """
mutation DeletePost($id: ID!) {
  deletePost(id: $id)
}
"""

UPDATE_POST_PAGE = """
mutation UpdatePostPage($id: ID!, $mediaS3Key: String, $prompt: String) {
  updatePostPage(id: $id, mediaS3Key: $mediaS3Key, prompt: $prompt) {
    id
    sortOrder
    mediaS3Key
    prompt
  }
}
"""

CREATE_POST_PAGE = """
mutation CreatePostPage($postId: ID!, $mediaS3Key: String, $prompt: String) {
  createPostPage(postId: $postId, mediaS3Key: $mediaS3Key, prompt: $prompt) {
    id
    sortOrder
    mediaS3Key
    prompt
    mediaVersions {
      id
      mediaS3Key
      prompt
      createdAt
    }
  }
}
"""

OTHER_USER_ID = "clerk_other_user"
VALID_MEDIA_KEY = f"users/{GRAPHQL_TEST_USER_ID}/posts/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.webp"
VALID_MEDIA_KEY_2 = f"users/{GRAPHQL_TEST_USER_ID}/posts/bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee.webp"


def _seed_workspace(*, owner_id: str = GRAPHQL_TEST_USER_ID) -> int:
    session = SessionLocal()
    try:
        session.query(InstagramPostPageMediaVersion).delete()
        session.query(InstagramPostPage).delete()
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
    assert len(created["pages"]) == 1
    assert created["pages"][0]["sortOrder"] == 0

    list_result = asyncio.run(schema.execute(POSTS_QUERY, context_value=graphql_auth_context()))
    assert not list_result.errors, list_result.errors
    posts = list_result.data["posts"]
    assert len(posts) == 1
    assert posts[0]["id"] == created["id"]
    assert posts[0]["title"] == "Summer special"
    assert len(posts[0]["pages"]) == 1


def test_post_query_returns_single_post_with_pages():
    _seed_workspace()

    create_result = asyncio.run(
        schema.execute(
            CREATE_POST,
            variable_values={"title": "Carousel draft"},
            context_value=graphql_auth_context(),
        )
    )
    assert not create_result.errors, create_result.errors
    post_id = create_result.data["createPost"]["id"]

    post_result = asyncio.run(
        schema.execute(
            POST_QUERY,
            variable_values={"id": post_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not post_result.errors, post_result.errors
    post = post_result.data["post"]
    assert post is not None
    assert post["title"] == "Carousel draft"
    assert len(post["pages"]) == 1


def test_post_query_hidden_from_other_workspace_user():
    workspace_id = _seed_workspace()
    session = SessionLocal()
    try:
        post = InstagramPost(
            workspace_id=workspace_id,
            title="Owner draft",
            status="draft",
            created_by_clerk_user_id=GRAPHQL_TEST_USER_ID,
        )
        session.add(post)
        session.flush()
        session.add(InstagramPostPage(post_id=post.id, sort_order=0))
        session.commit()
        session.refresh(post)
        post_id = str(post.id)
    finally:
        session.close()

    result = asyncio.run(
        schema.execute(
            POST_QUERY,
            variable_values={"id": post_id},
            context_value={"user_id": OTHER_USER_ID},
        )
    )
    assert not result.errors, result.errors
    assert result.data["post"] is None


def test_update_post_page_sets_media_and_prompt():
    _seed_workspace()

    create_result = asyncio.run(
        schema.execute(
            CREATE_POST,
            variable_values={"title": "With image"},
            context_value=graphql_auth_context(),
        )
    )
    assert not create_result.errors, create_result.errors
    page_id = create_result.data["createPost"]["pages"][0]["id"]

    update_result = asyncio.run(
        schema.execute(
            UPDATE_POST_PAGE,
            variable_values={
                "id": page_id,
                "mediaS3Key": VALID_MEDIA_KEY,
                "prompt": "A sunny patio brunch",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not update_result.errors, update_result.errors
    updated = update_result.data["updatePostPage"]
    assert updated["mediaS3Key"] == VALID_MEDIA_KEY
    assert updated["prompt"] == "A sunny patio brunch"


def test_update_post_page_appends_media_versions():
    _seed_workspace()

    create_result = asyncio.run(
        schema.execute(
            CREATE_POST,
            variable_values={"title": "Versioned image"},
            context_value=graphql_auth_context(),
        )
    )
    assert not create_result.errors, create_result.errors
    post_id = create_result.data["createPost"]["id"]
    page_id = create_result.data["createPost"]["pages"][0]["id"]

    first_update = asyncio.run(
        schema.execute(
            UPDATE_POST_PAGE,
            variable_values={
                "id": page_id,
                "mediaS3Key": VALID_MEDIA_KEY,
                "prompt": "First prompt",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not first_update.errors, first_update.errors

    second_update = asyncio.run(
        schema.execute(
            UPDATE_POST_PAGE,
            variable_values={
                "id": page_id,
                "mediaS3Key": VALID_MEDIA_KEY_2,
                "prompt": "Second prompt",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not second_update.errors, second_update.errors
    assert second_update.data["updatePostPage"]["mediaS3Key"] == VALID_MEDIA_KEY_2

    post_result = asyncio.run(
        schema.execute(
            POST_QUERY,
            variable_values={"id": post_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not post_result.errors, post_result.errors
    page = post_result.data["post"]["pages"][0]
    versions = page["mediaVersions"]
    assert len(versions) == 2
    assert versions[0]["mediaS3Key"] == VALID_MEDIA_KEY_2
    assert versions[0]["prompt"] == "Second prompt"
    assert versions[1]["mediaS3Key"] == VALID_MEDIA_KEY
    assert versions[1]["prompt"] == "First prompt"


def test_update_post_page_skips_duplicate_media_version():
    _seed_workspace()

    create_result = asyncio.run(
        schema.execute(
            CREATE_POST,
            variable_values={"title": "Duplicate key"},
            context_value=graphql_auth_context(),
        )
    )
    assert not create_result.errors, create_result.errors
    page_id = create_result.data["createPost"]["pages"][0]["id"]

    asyncio.run(
        schema.execute(
            UPDATE_POST_PAGE,
            variable_values={
                "id": page_id,
                "mediaS3Key": VALID_MEDIA_KEY,
                "prompt": "Same image",
            },
            context_value=graphql_auth_context(),
        )
    )
    repeat_update = asyncio.run(
        schema.execute(
            UPDATE_POST_PAGE,
            variable_values={
                "id": page_id,
                "mediaS3Key": VALID_MEDIA_KEY,
                "prompt": "Same image again",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not repeat_update.errors, repeat_update.errors

    session = SessionLocal()
    try:
        page_pk = int(page_id)
        count = (
            session.query(InstagramPostPageMediaVersion)
            .filter(InstagramPostPageMediaVersion.post_page_id == page_pk)
            .count()
        )
        assert count == 1
    finally:
        session.close()


def test_update_post_page_reselects_existing_media_version():
    _seed_workspace()

    create_result = asyncio.run(
        schema.execute(
            CREATE_POST,
            variable_values={"title": "Reselect version"},
            context_value=graphql_auth_context(),
        )
    )
    assert not create_result.errors, create_result.errors
    post_id = create_result.data["createPost"]["id"]
    page_id = create_result.data["createPost"]["pages"][0]["id"]

    asyncio.run(
        schema.execute(
            UPDATE_POST_PAGE,
            variable_values={
                "id": page_id,
                "mediaS3Key": VALID_MEDIA_KEY,
                "prompt": "First prompt",
            },
            context_value=graphql_auth_context(),
        )
    )
    asyncio.run(
        schema.execute(
            UPDATE_POST_PAGE,
            variable_values={
                "id": page_id,
                "mediaS3Key": VALID_MEDIA_KEY_2,
                "prompt": "Second prompt",
            },
            context_value=graphql_auth_context(),
        )
    )

    reselect_result = asyncio.run(
        schema.execute(
            UPDATE_POST_PAGE,
            variable_values={
                "id": page_id,
                "mediaS3Key": VALID_MEDIA_KEY,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not reselect_result.errors, reselect_result.errors
    assert reselect_result.data["updatePostPage"]["mediaS3Key"] == VALID_MEDIA_KEY

    session = SessionLocal()
    try:
        page_pk = int(page_id)
        count = (
            session.query(InstagramPostPageMediaVersion)
            .filter(InstagramPostPageMediaVersion.post_page_id == page_pk)
            .count()
        )
        assert count == 2
    finally:
        session.close()

    post_result = asyncio.run(
        schema.execute(
            POST_QUERY,
            variable_values={"id": post_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not post_result.errors, post_result.errors
    page = post_result.data["post"]["pages"][0]
    assert page["mediaS3Key"] == VALID_MEDIA_KEY


def test_update_post_page_rejects_invalid_media_key():
    _seed_workspace()

    create_result = asyncio.run(
        schema.execute(
            CREATE_POST,
            variable_values={"title": "Bad key"},
            context_value=graphql_auth_context(),
        )
    )
    assert not create_result.errors, create_result.errors
    page_id = create_result.data["createPost"]["pages"][0]["id"]

    update_result = asyncio.run(
        schema.execute(
            UPDATE_POST_PAGE,
            variable_values={
                "id": page_id,
                "mediaS3Key": "users/other-user/posts/evil.webp",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert update_result.errors is not None


def test_posts_hidden_from_other_workspace_user():
    workspace_id = _seed_workspace()
    session = SessionLocal()
    try:
        post = InstagramPost(
            workspace_id=workspace_id,
            title="Owner draft",
            status="draft",
            created_by_clerk_user_id=GRAPHQL_TEST_USER_ID,
        )
        session.add(post)
        session.flush()
        session.add(InstagramPostPage(post_id=post.id, sort_order=0))
        session.commit()
    finally:
        session.close()

    result = asyncio.run(schema.execute(POSTS_QUERY, context_value={"user_id": OTHER_USER_ID}))
    assert not result.errors, result.errors
    assert result.data["posts"] == []


def test_delete_post_requires_auth():
    result = schema.execute_sync(DELETE_POST, variable_values={"id": "1"})
    assert result.errors is not None


def test_delete_post_and_list_posts():
    _seed_workspace()

    create_result = asyncio.run(
        schema.execute(
            CREATE_POST,
            variable_values={"title": "To delete"},
            context_value=graphql_auth_context(),
        )
    )
    assert not create_result.errors, create_result.errors
    post_id = create_result.data["createPost"]["id"]

    delete_result = asyncio.run(
        schema.execute(
            DELETE_POST,
            variable_values={"id": post_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not delete_result.errors, delete_result.errors
    assert delete_result.data["deletePost"] is True

    list_result = asyncio.run(schema.execute(POSTS_QUERY, context_value=graphql_auth_context()))
    assert not list_result.errors, list_result.errors
    assert list_result.data["posts"] == []


def test_delete_post_denied_for_other_workspace_user():
    workspace_id = _seed_workspace()
    session = SessionLocal()
    try:
        post = InstagramPost(
            workspace_id=workspace_id,
            title="Owner draft",
            status="draft",
            created_by_clerk_user_id=GRAPHQL_TEST_USER_ID,
        )
        session.add(post)
        session.flush()
        session.add(InstagramPostPage(post_id=post.id, sort_order=0))
        session.commit()
        session.refresh(post)
        post_id = str(post.id)
    finally:
        session.close()

    delete_result = asyncio.run(
        schema.execute(
            DELETE_POST,
            variable_values={"id": post_id},
            context_value={"user_id": OTHER_USER_ID},
        )
    )
    assert delete_result.errors is not None


DELETE_POST_PAGE_MEDIA_VERSION = """
mutation DeletePostPageMediaVersion($pageId: ID!, $mediaS3Key: String!) {
  deletePostPageMediaVersion(pageId: $pageId, mediaS3Key: $mediaS3Key) {
    id
    mediaS3Key
    mediaVersions {
      id
      mediaS3Key
    }
  }
}
"""


def _create_post_with_two_versions() -> tuple[str, str]:
    create_result = asyncio.run(
        schema.execute(
            CREATE_POST,
            variable_values={"title": "Delete version"},
            context_value=graphql_auth_context(),
        )
    )
    assert not create_result.errors, create_result.errors
    page_id = create_result.data["createPost"]["pages"][0]["id"]

    for key, prompt in (
        (VALID_MEDIA_KEY, "First prompt"),
        (VALID_MEDIA_KEY_2, "Second prompt"),
    ):
        update_result = asyncio.run(
            schema.execute(
                UPDATE_POST_PAGE,
                variable_values={"id": page_id, "mediaS3Key": key, "prompt": prompt},
                context_value=graphql_auth_context(),
            )
        )
        assert not update_result.errors, update_result.errors

    return create_result.data["createPost"]["id"], page_id


def test_delete_post_page_media_version_requires_auth():
    result = asyncio.run(
        schema.execute(
            DELETE_POST_PAGE_MEDIA_VERSION,
            variable_values={"pageId": "1", "mediaS3Key": VALID_MEDIA_KEY},
            context_value={},
        )
    )
    assert result.errors is not None


def test_delete_post_page_media_version_non_committed():
    _seed_workspace()
    _, page_id = _create_post_with_two_versions()

    delete_result = asyncio.run(
        schema.execute(
            DELETE_POST_PAGE_MEDIA_VERSION,
            variable_values={"pageId": page_id, "mediaS3Key": VALID_MEDIA_KEY},
            context_value=graphql_auth_context(),
        )
    )
    assert not delete_result.errors, delete_result.errors
    page = delete_result.data["deletePostPageMediaVersion"]
    assert page["mediaS3Key"] == VALID_MEDIA_KEY_2
    assert len(page["mediaVersions"]) == 1
    assert page["mediaVersions"][0]["mediaS3Key"] == VALID_MEDIA_KEY_2


def test_delete_post_page_media_version_committed_reassigns():
    _seed_workspace()
    _, page_id = _create_post_with_two_versions()

    delete_result = asyncio.run(
        schema.execute(
            DELETE_POST_PAGE_MEDIA_VERSION,
            variable_values={"pageId": page_id, "mediaS3Key": VALID_MEDIA_KEY_2},
            context_value=graphql_auth_context(),
        )
    )
    assert not delete_result.errors, delete_result.errors
    page = delete_result.data["deletePostPageMediaVersion"]
    assert page["mediaS3Key"] == VALID_MEDIA_KEY
    assert len(page["mediaVersions"]) == 1
    assert page["mediaVersions"][0]["mediaS3Key"] == VALID_MEDIA_KEY


def test_delete_post_page_media_version_last_version_clears_committed():
    _seed_workspace()

    create_result = asyncio.run(
        schema.execute(
            CREATE_POST,
            variable_values={"title": "Delete last"},
            context_value=graphql_auth_context(),
        )
    )
    assert not create_result.errors, create_result.errors
    page_id = create_result.data["createPost"]["pages"][0]["id"]

    asyncio.run(
        schema.execute(
            UPDATE_POST_PAGE,
            variable_values={
                "id": page_id,
                "mediaS3Key": VALID_MEDIA_KEY,
                "prompt": "Only version",
            },
            context_value=graphql_auth_context(),
        )
    )

    delete_result = asyncio.run(
        schema.execute(
            DELETE_POST_PAGE_MEDIA_VERSION,
            variable_values={"pageId": page_id, "mediaS3Key": VALID_MEDIA_KEY},
            context_value=graphql_auth_context(),
        )
    )
    assert not delete_result.errors, delete_result.errors
    page = delete_result.data["deletePostPageMediaVersion"]
    assert page["mediaS3Key"] is None
    assert page["mediaVersions"] == []


def test_create_post_page_requires_auth():
    result = asyncio.run(
        schema.execute(
            CREATE_POST_PAGE,
            variable_values={"postId": "1"},
            context_value={},
        )
    )
    assert result.errors is not None


def test_create_post_page_adds_second_page():
    _seed_workspace()

    create_result = asyncio.run(
        schema.execute(
            CREATE_POST,
            variable_values={"title": "Carousel"},
            context_value=graphql_auth_context(),
        )
    )
    assert not create_result.errors, create_result.errors
    post_id = create_result.data["createPost"]["id"]

    page_result = asyncio.run(
        schema.execute(
            CREATE_POST_PAGE,
            variable_values={"postId": post_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not page_result.errors, page_result.errors
    page = page_result.data["createPostPage"]
    assert page["sortOrder"] == 1
    assert page["mediaS3Key"] is None
    assert page["mediaVersions"] == []


def test_create_post_page_sets_media_and_prompt():
    _seed_workspace()

    create_result = asyncio.run(
        schema.execute(
            CREATE_POST,
            variable_values={"title": "With media"},
            context_value=graphql_auth_context(),
        )
    )
    assert not create_result.errors, create_result.errors
    post_id = create_result.data["createPost"]["id"]

    page_result = asyncio.run(
        schema.execute(
            CREATE_POST_PAGE,
            variable_values={
                "postId": post_id,
                "mediaS3Key": VALID_MEDIA_KEY,
                "prompt": "Copied prompt",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not page_result.errors, page_result.errors
    page = page_result.data["createPostPage"]
    assert page["sortOrder"] == 1
    assert page["mediaS3Key"] == VALID_MEDIA_KEY
    assert page["prompt"] == "Copied prompt"
    assert len(page["mediaVersions"]) == 1
    assert page["mediaVersions"][0]["mediaS3Key"] == VALID_MEDIA_KEY
    assert page["mediaVersions"][0]["prompt"] == "Copied prompt"


def test_create_post_page_rejects_max_pages():
    _seed_workspace()

    create_result = asyncio.run(
        schema.execute(
            CREATE_POST,
            variable_values={"title": "Max pages"},
            context_value=graphql_auth_context(),
        )
    )
    assert not create_result.errors, create_result.errors
    post_id = create_result.data["createPost"]["id"]

    for _ in range(9):
        page_result = asyncio.run(
            schema.execute(
                CREATE_POST_PAGE,
                variable_values={"postId": post_id},
                context_value=graphql_auth_context(),
            )
        )
        assert not page_result.errors, page_result.errors

    overflow_result = asyncio.run(
        schema.execute(
            CREATE_POST_PAGE,
            variable_values={"postId": post_id},
            context_value=graphql_auth_context(),
        )
    )
    assert overflow_result.errors is not None
    assert "maximum" in str(overflow_result.errors[0]).lower()


def test_create_post_page_denied_for_other_workspace_user():
    _seed_workspace()

    create_result = asyncio.run(
        schema.execute(
            CREATE_POST,
            variable_values={"title": "Private"},
            context_value=graphql_auth_context(),
        )
    )
    assert not create_result.errors, create_result.errors
    post_id = create_result.data["createPost"]["id"]

    _seed_workspace(owner_id=OTHER_USER_ID)

    page_result = asyncio.run(
        schema.execute(
            CREATE_POST_PAGE,
            variable_values={"postId": post_id},
            context_value={"user_id": OTHER_USER_ID},
        )
    )
    assert page_result.errors is not None
