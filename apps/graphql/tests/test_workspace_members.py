import asyncio
from datetime import UTC, datetime

from graphql.data_sources import SessionLocal, Workspace, WorkspaceMembership
from graphql.schema import schema
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context

INVITE_WORKSPACE_MEMBER = """
mutation InviteWorkspaceMember($workspaceId: ID!, $clerkUserId: String!) {
  inviteWorkspaceMember(workspaceId: $workspaceId, clerkUserId: $clerkUserId) {
    id
    workspaceId
    clerkUserId
    role
    invitedAt
    acceptedAt
  }
}
"""

OWNER_ID = GRAPHQL_TEST_USER_ID
MEMBER_ID = "clerk_test_member"
INVITEE_ID = "clerk_test_invitee"


def _seed_workspace(*, owner_id: str = OWNER_ID, with_member: bool = False) -> int:
    session = SessionLocal()
    try:
        session.query(WorkspaceMembership).delete()
        session.query(Workspace).delete()
        session.commit()

        now = datetime.now(tz=UTC)
        ws = Workspace(name="Test workspace", owner_clerk_user_id=owner_id)
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
        if with_member:
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


def test_owner_can_invite_workspace_member():
    workspace_id = _seed_workspace()

    result = asyncio.run(
        schema.execute(
            INVITE_WORKSPACE_MEMBER,
            variable_values={"workspaceId": str(workspace_id), "clerkUserId": INVITEE_ID},
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors, result.errors
    data = result.data["inviteWorkspaceMember"]
    assert data["clerkUserId"] == INVITEE_ID
    assert data["role"] == "member"
    assert data["acceptedAt"] is not None

    session = SessionLocal()
    try:
        row = (
            session.query(WorkspaceMembership)
            .filter(
                WorkspaceMembership.workspace_id == workspace_id,
                WorkspaceMembership.clerk_user_id == INVITEE_ID,
            )
            .first()
        )
        assert row is not None
        assert row.accepted_at is not None
    finally:
        session.close()


def test_non_owner_cannot_invite_workspace_member():
    workspace_id = _seed_workspace(with_member=True)

    result = asyncio.run(
        schema.execute(
            INVITE_WORKSPACE_MEMBER,
            variable_values={"workspaceId": str(workspace_id), "clerkUserId": INVITEE_ID},
            context_value={"user_id": MEMBER_ID},
        )
    )
    assert result.errors
    assert any("Access denied" in str(err) for err in result.errors)


def test_invite_duplicate_member_errors():
    workspace_id = _seed_workspace()

    asyncio.run(
        schema.execute(
            INVITE_WORKSPACE_MEMBER,
            variable_values={"workspaceId": str(workspace_id), "clerkUserId": INVITEE_ID},
            context_value=graphql_auth_context(),
        )
    )

    result = asyncio.run(
        schema.execute(
            INVITE_WORKSPACE_MEMBER,
            variable_values={"workspaceId": str(workspace_id), "clerkUserId": INVITEE_ID},
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors
    assert any("already a member" in str(err) for err in result.errors)


def test_owner_cannot_invite_self():
    workspace_id = _seed_workspace()

    result = asyncio.run(
        schema.execute(
            INVITE_WORKSPACE_MEMBER,
            variable_values={"workspaceId": str(workspace_id), "clerkUserId": OWNER_ID},
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors
    assert any("Cannot invite yourself" in str(err) for err in result.errors)
