from graphql.schema.media_s3_keys import validate_workspace_post_media_s3_key


def test_accepts_workspace_posts_key():
    validate_workspace_post_media_s3_key(
        "workspaces/42/posts/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.webp",
        workspace_id=42,
        owner_clerk_user_id="owner_1",
    )


def test_accepts_legacy_owner_posts_key_without_workspace():
    validate_workspace_post_media_s3_key(
        "users/owner_1/posts/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.webp",
        workspace_id=None,
        owner_clerk_user_id="owner_1",
    )


def test_rejects_workspace_key_when_workspace_id_missing():
    try:
        validate_workspace_post_media_s3_key(
            "workspaces/42/posts/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.webp",
            workspace_id=None,
            owner_clerk_user_id="owner_1",
        )
        raise AssertionError("expected ValueError")
    except ValueError as err:
        assert "Invalid media_s3_key" in str(err)


def test_rejects_other_user_legacy_key():
    try:
        validate_workspace_post_media_s3_key(
            "users/other/posts/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.webp",
            workspace_id=42,
            owner_clerk_user_id="owner_1",
        )
        raise AssertionError("expected ValueError")
    except ValueError as err:
        assert "Invalid media_s3_key" in str(err)


def test_rejects_other_workspace_key():
    try:
        validate_workspace_post_media_s3_key(
            "workspaces/99/posts/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.webp",
            workspace_id=42,
            owner_clerk_user_id="owner_1",
        )
        raise AssertionError("expected ValueError")
    except ValueError as err:
        assert "Invalid media_s3_key" in str(err)


def test_rejects_unsafe_filename():
    try:
        validate_workspace_post_media_s3_key(
            "workspaces/42/posts/not-a-uuid.webp",
            workspace_id=42,
            owner_clerk_user_id="owner_1",
        )
        raise AssertionError("expected ValueError")
    except ValueError as err:
        assert "Invalid media_s3_key" in str(err)
