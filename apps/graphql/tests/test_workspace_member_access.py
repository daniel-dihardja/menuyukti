"""Workspace primary selection, remove, and member vs outsider access."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime, timedelta

from graphql.access import is_location_owner
from graphql.data_sources import (
    InstagramPost,
    InstagramPostPage,
    InstagramPostPageMediaVersion,
    Location,
    SessionLocal,
    Workspace,
    WorkspaceMembership,
)
from graphql.schema import schema
from graphql.services.workspace_scope import primary_workspace_id
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context

OWNER_ID = GRAPHQL_TEST_USER_ID
MEMBER_ID = "clerk_test_member"
OUTSIDER_ID = "clerk_test_outsider"
INVITEE_ID = "clerk_test_invitee_primary"

REMOVE_WORKSPACE_MEMBER = """
mutation RemoveWorkspaceMember($workspaceId: ID!, $clerkUserId: String!) {
  removeWorkspaceMember(workspaceId: $workspaceId, clerkUserId: $clerkUserId)
}
"""

LOCATION_QUERY = """
query Location($id: ID!) {
  location(id: $id) {
    id
    name
  }
}
"""

MY_WORKSPACE = """
query MyWorkspace {
  myWorkspace {
    id
    name
  }
}
"""

CREATE_POST = """
mutation CreatePost($title: String) {
  createPost(title: $title) {
    id
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


def _clear_workspace_tables(session) -> None:
    session.query(InstagramPostPageMediaVersion).delete()
    session.query(InstagramPostPage).delete()
    session.query(InstagramPost).delete()
    session.query(Location).delete()
    session.query(WorkspaceMembership).delete()
    session.query(Workspace).delete()
    session.commit()


def _seed_workspace_with_member_and_location() -> tuple[int, int]:
    session = SessionLocal()
    try:
        _clear_workspace_tables(session)
        now = datetime.now(tz=UTC)
        ws = Workspace(name="Team workspace", owner_clerk_user_id=OWNER_ID)
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
        loc = Location(
            name="Shared venue",
            workspace_id=ws.id,
            clerk_user_id=OWNER_ID,
        )
        session.add(loc)
        session.commit()
        session.refresh(ws)
        session.refresh(loc)
        return ws.id, loc.id
    finally:
        session.close()


def test_owner_can_remove_member():
    workspace_id, _location_id = _seed_workspace_with_member_and_location()

    result = asyncio.run(
        schema.execute(
            REMOVE_WORKSPACE_MEMBER,
            variable_values={"workspaceId": str(workspace_id), "clerkUserId": MEMBER_ID},
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors, result.errors
    assert result.data["removeWorkspaceMember"] is True

    session = SessionLocal()
    try:
        row = (
            session.query(WorkspaceMembership)
            .filter(
                WorkspaceMembership.workspace_id == workspace_id,
                WorkspaceMembership.clerk_user_id == MEMBER_ID,
            )
            .first()
        )
        assert row is None
    finally:
        session.close()


def test_member_cannot_remove_workspace_member():
    workspace_id, _location_id = _seed_workspace_with_member_and_location()

    result = asyncio.run(
        schema.execute(
            REMOVE_WORKSPACE_MEMBER,
            variable_values={"workspaceId": str(workspace_id), "clerkUserId": MEMBER_ID},
            context_value=_auth(MEMBER_ID),
        )
    )
    assert result.errors
    assert any("Access denied" in str(err) for err in result.errors)


def test_owner_cannot_remove_self_as_owner():
    workspace_id, _location_id = _seed_workspace_with_member_and_location()

    result = asyncio.run(
        schema.execute(
            REMOVE_WORKSPACE_MEMBER,
            variable_values={"workspaceId": str(workspace_id), "clerkUserId": OWNER_ID},
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors
    assert any("Cannot remove yourself" in str(err) for err in result.errors)


def test_member_can_access_shared_location_outsider_cannot():
    _workspace_id, location_id = _seed_workspace_with_member_and_location()

    member_result = asyncio.run(
        schema.execute(
            LOCATION_QUERY,
            variable_values={"id": str(location_id)},
            context_value=_auth(MEMBER_ID),
        )
    )
    assert not member_result.errors, member_result.errors
    assert member_result.data["location"]["id"] == str(location_id)

    outsider_result = asyncio.run(
        schema.execute(
            LOCATION_QUERY,
            variable_values={"id": str(location_id)},
            context_value=_auth(OUTSIDER_ID),
        )
    )
    assert not outsider_result.errors, outsider_result.errors
    assert outsider_result.data["location"] is None

    session = SessionLocal()
    try:
        assert is_location_owner(session, location_id, MEMBER_ID) is True
        assert is_location_owner(session, location_id, OUTSIDER_ID) is False
    finally:
        session.close()


def test_after_remove_former_member_loses_location_and_media_access():
    workspace_id, location_id = _seed_workspace_with_member_and_location()

    create_result = asyncio.run(
        schema.execute(
            CREATE_POST,
            variable_values={"title": "Team draft"},
            context_value=graphql_auth_context(),
        )
    )
    assert not create_result.errors, create_result.errors
    page_id = create_result.data["createPost"]["pages"][0]["id"]
    filename = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.webp"
    media_key = f"workspaces/{workspace_id}/posts/{filename}"

    remove_result = asyncio.run(
        schema.execute(
            REMOVE_WORKSPACE_MEMBER,
            variable_values={"workspaceId": str(workspace_id), "clerkUserId": MEMBER_ID},
            context_value=graphql_auth_context(),
        )
    )
    assert not remove_result.errors, remove_result.errors

    session = SessionLocal()
    try:
        assert is_location_owner(session, location_id, MEMBER_ID) is False
    finally:
        session.close()

    location_result = asyncio.run(
        schema.execute(
            LOCATION_QUERY,
            variable_values={"id": str(location_id)},
            context_value=_auth(MEMBER_ID),
        )
    )
    assert not location_result.errors, location_result.errors
    assert location_result.data["location"] is None

    media_result = asyncio.run(
        schema.execute(
            UPDATE_POST_PAGE,
            variable_values={"id": page_id, "mediaS3Key": media_key},
            context_value=_auth(MEMBER_ID),
        )
    )
    assert media_result.errors is not None


def test_primary_workspace_prefers_most_recently_accepted_membership():
    session = SessionLocal()
    try:
        _clear_workspace_tables(session)
        older = datetime.now(tz=UTC) - timedelta(days=7)
        newer = datetime.now(tz=UTC)

        personal = Workspace(name="My workspace", owner_clerk_user_id=INVITEE_ID)
        session.add(personal)
        session.flush()
        session.add(
            WorkspaceMembership(
                workspace_id=personal.id,
                clerk_user_id=INVITEE_ID,
                role="owner",
                invited_at=older,
                accepted_at=older,
            )
        )

        team = Workspace(name="Team workspace", owner_clerk_user_id=OWNER_ID)
        session.add(team)
        session.flush()
        session.add(
            WorkspaceMembership(
                workspace_id=team.id,
                clerk_user_id=OWNER_ID,
                role="owner",
                invited_at=newer,
                accepted_at=newer,
            )
        )
        session.add(
            WorkspaceMembership(
                workspace_id=team.id,
                clerk_user_id=INVITEE_ID,
                role="member",
                invited_at=newer,
                accepted_at=newer,
            )
        )
        session.commit()
        personal_id = personal.id
        team_id = team.id
    finally:
        session.close()

    # Personal workspace has a lower id but older acceptance; team should win.
    assert personal_id < team_id

    session = SessionLocal()
    try:
        assert primary_workspace_id(session, INVITEE_ID) == team_id
    finally:
        session.close()

    result = asyncio.run(
        schema.execute(
            MY_WORKSPACE,
            context_value=_auth(INVITEE_ID),
        )
    )
    assert not result.errors, result.errors
    assert result.data["myWorkspace"]["id"] == str(team_id)
    assert result.data["myWorkspace"]["name"] == "Team workspace"
