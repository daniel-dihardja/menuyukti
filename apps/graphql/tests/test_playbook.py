import asyncio

from graphql.data_sources import Location, Node, SessionLocal
from graphql.data_sources.models.playbook import Playbook
from graphql.schema import schema
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context

CREATE_PLAYBOOK = """
mutation CreatePlaybook(
  $locationId: Int!
  $name: String!
  $playbookType: String!
  $startDate: String!
  $endDate: String!
) {
  createPlaybook(
    locationId: $locationId
    name: $name
    playbookType: $playbookType
    startDate: $startDate
    endDate: $endDate
  ) {
    id
    locationId
    name
    playbookType
    startDate
    endDate
  }
}
"""

PLAYBOOKS_QUERY = """
query Playbooks($playbookType: String!) {
  playbooks(playbookType: $playbookType) {
    id
    locationId
    name
    playbookType
    startDate
    endDate
  }
}
"""

PLAYBOOK_QUERY = """
query Playbook($id: Int!) {
  playbook(id: $id) {
    id
    name
    playbookType
  }
}
"""

DELETE_PLAYBOOK = """
mutation DeletePlaybook($id: Int!) {
  deletePlaybook(id: $id)
}
"""

UPDATE_PLAYBOOK = """
mutation UpdatePlaybook(
  $id: Int!
  $name: String!
  $locationId: Int!
  $startDate: String!
  $endDate: String!
) {
  updatePlaybook(
    id: $id
    name: $name
    locationId: $locationId
    startDate: $startDate
    endDate: $endDate
  ) {
    id
    name
    locationId
    startDate
    endDate
  }
}
"""


def _create_location(name: str) -> int:
    session = SessionLocal()
    try:
        session.query(Playbook).delete()
        session.query(Node).delete()
        session.query(Location).filter(Location.clerk_user_id == GRAPHQL_TEST_USER_ID).delete()
        session.commit()

        location = Location(name=name, clerk_user_id=GRAPHQL_TEST_USER_ID)
        session.add(location)
        session.commit()
        session.refresh(location)
        return location.id
    finally:
        session.close()


def test_create_list_get_delete_playbook():
    location_id = _create_location("Playbook Location")
    create_result = asyncio.run(
        schema.execute(
            CREATE_PLAYBOOK,
            variable_values={
                "locationId": location_id,
                "name": "Holiday stories · Q4",
                "playbookType": "public_holidays",
                "startDate": "2026-09-01",
                "endDate": "2026-12-01",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not create_result.errors, create_result.errors
    created = create_result.data["createPlaybook"]
    assert created["name"] == "Holiday stories · Q4"
    assert created["locationId"] == location_id
    assert created["playbookType"] == "public_holidays"
    assert created["startDate"] == "2026-09-01"
    assert created["endDate"] == "2026-12-01"
    playbook_id = created["id"]

    list_result = asyncio.run(
        schema.execute(
            PLAYBOOKS_QUERY,
            variable_values={"playbookType": "public_holidays"},
            context_value=graphql_auth_context(),
        )
    )
    assert not list_result.errors, list_result.errors
    rows = list_result.data["playbooks"]
    assert len(rows) == 1
    assert rows[0]["id"] == playbook_id

    get_result = asyncio.run(
        schema.execute(
            PLAYBOOK_QUERY,
            variable_values={"id": playbook_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not get_result.errors, get_result.errors
    assert get_result.data["playbook"]["name"] == "Holiday stories · Q4"

    delete_result = asyncio.run(
        schema.execute(
            DELETE_PLAYBOOK,
            variable_values={"id": playbook_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not delete_result.errors, delete_result.errors
    assert delete_result.data["deletePlaybook"] is True

    empty_list = asyncio.run(
        schema.execute(
            PLAYBOOKS_QUERY,
            variable_values={"playbookType": "public_holidays"},
            context_value=graphql_auth_context(),
        )
    )
    assert not empty_list.errors, empty_list.errors
    assert empty_list.data["playbooks"] == []


def test_create_playbook_requires_auth():
    location_id = _create_location("Playbook Unauth")
    result = asyncio.run(
        schema.execute(
            CREATE_PLAYBOOK,
            variable_values={
                "locationId": location_id,
                "name": "Nope",
                "playbookType": "public_holidays",
                "startDate": "2026-09-01",
                "endDate": "2026-12-01",
            },
            context_value={},
        )
    )
    assert result.errors
    assert "authenticated" in str(result.errors[0]).lower()


def test_create_playbook_rejects_bad_dates():
    location_id = _create_location("Playbook Bad Dates")
    result = asyncio.run(
        schema.execute(
            CREATE_PLAYBOOK,
            variable_values={
                "locationId": location_id,
                "name": "Bad range",
                "playbookType": "public_holidays",
                "startDate": "2026-12-01",
                "endDate": "2026-09-01",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors
    assert "enddate" in str(result.errors[0]).lower()


def test_update_playbook():
    location_id = _create_location("Playbook Update Location")
    create_result = asyncio.run(
        schema.execute(
            CREATE_PLAYBOOK,
            variable_values={
                "locationId": location_id,
                "name": "Original name",
                "playbookType": "public_holidays",
                "startDate": "2026-09-01",
                "endDate": "2026-12-01",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not create_result.errors, create_result.errors
    playbook_id = create_result.data["createPlaybook"]["id"]

    update_result = asyncio.run(
        schema.execute(
            UPDATE_PLAYBOOK,
            variable_values={
                "id": playbook_id,
                "name": "Updated name",
                "locationId": location_id,
                "startDate": "2026-10-01",
                "endDate": "2026-12-15",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not update_result.errors, update_result.errors
    updated = update_result.data["updatePlaybook"]
    assert updated["name"] == "Updated name"
    assert updated["startDate"] == "2026-10-01"
    assert updated["endDate"] == "2026-12-15"
