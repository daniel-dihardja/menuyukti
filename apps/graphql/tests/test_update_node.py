import asyncio

from graphql.data_sources import Location, Node, SessionLocal
from graphql.schema import schema
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context

CREATE_NODE = """
mutation CreateNode(
  $locationId: Int!
  $nodeType: String!
  $name: String
  $parentId: ID
) {
  createNode(
    locationId: $locationId
    nodeType: $nodeType
    name: $name
    parentId: $parentId
  ) {
    id
    name
    nodeType
  }
}
"""

UPDATE_NODE = """
mutation UpdateNode($id: ID!, $name: String, $data: JSON) {
  updateNode(id: $id, name: $name, data: $data) {
    id
    name
    nodeType
    data
    milestoneGoal
    milestonePresetData
    passCriterias
  }
}
"""


def test_update_milestone_name():
    session = SessionLocal()
    try:
        session.query(Node).delete()
        session.query(Location).filter(Location.clerk_user_id == GRAPHQL_TEST_USER_ID).delete()
        session.commit()

        location = Location(name="Update Node Location", clerk_user_id=GRAPHQL_TEST_USER_ID)
        session.add(location)
        session.commit()
        session.refresh(location)
        location_id = location.id
    finally:
        session.close()

    campaign = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "workflow",
                "name": "Campaign",
                "parentId": None,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not campaign.errors, campaign.errors
    campaign_id = campaign.data["createNode"]["id"]

    first = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "milestone",
                "name": "Original",
                "parentId": campaign_id,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not first.errors, first.errors
    milestone_id = first.data["createNode"]["id"]

    updated = asyncio.run(
        schema.execute(
            UPDATE_NODE,
            variable_values={"id": milestone_id, "name": "  Renamed title  "},
            context_value=graphql_auth_context(),
        )
    )
    assert not updated.errors, updated.errors
    data = updated.data["updateNode"]
    assert data["id"] == milestone_id
    assert data["name"] == "Renamed title"
    assert data["nodeType"] == "milestone"
    assert data["data"] == {"order": 1}


def test_update_milestone_pass_criteria_on_row():
    session = SessionLocal()
    try:
        session.query(Node).delete()
        session.query(Location).filter(Location.clerk_user_id == GRAPHQL_TEST_USER_ID).delete()
        session.commit()

        location = Location(name="Update PC Location", clerk_user_id=GRAPHQL_TEST_USER_ID)
        session.add(location)
        session.commit()
        session.refresh(location)
        location_id = location.id
    finally:
        session.close()

    campaign = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "workflow",
                "name": "Campaign",
                "parentId": None,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not campaign.errors, campaign.errors
    campaign_id = campaign.data["createNode"]["id"]

    first = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "milestone",
                "name": "M",
                "parentId": campaign_id,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not first.errors, first.errors
    milestone_id = first.data["createNode"]["id"]

    updated = asyncio.run(
        schema.execute(
            UPDATE_NODE,
            variable_values={
                "id": milestone_id,
                "data": {
                    "passCriterias": [
                        {"id": "pc-1", "requirement": "Ship feature", "status": "pass"}
                    ]
                },
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not updated.errors, updated.errors
    out = updated.data["updateNode"]
    assert out["passCriterias"][0]["requirement"] == "Ship feature"
    assert out["passCriterias"][0]["status"] == "pass"


def test_update_milestone_goal_in_data():
    session = SessionLocal()
    try:
        session.query(Node).delete()
        session.query(Location).filter(Location.clerk_user_id == GRAPHQL_TEST_USER_ID).delete()
        session.commit()

        location = Location(name="Update Goal Location", clerk_user_id=GRAPHQL_TEST_USER_ID)
        session.add(location)
        session.commit()
        session.refresh(location)
        location_id = location.id
    finally:
        session.close()

    campaign = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "workflow",
                "name": "Campaign",
                "parentId": None,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not campaign.errors, campaign.errors
    campaign_id = campaign.data["createNode"]["id"]

    milestone = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "milestone",
                "name": "M",
                "parentId": campaign_id,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not milestone.errors, milestone.errors
    milestone_id = milestone.data["createNode"]["id"]

    first = asyncio.run(
        schema.execute(
            UPDATE_NODE,
            variable_values={"id": milestone_id, "data": {"goal": "First"}},
            context_value=graphql_auth_context(),
        )
    )
    assert not first.errors, first.errors
    assert first.data["updateNode"]["milestoneGoal"] == "First"

    updated = asyncio.run(
        schema.execute(
            UPDATE_NODE,
            variable_values={"id": milestone_id, "data": {"goal": "Second draft"}},
            context_value=graphql_auth_context(),
        )
    )
    assert not updated.errors, updated.errors
    out = updated.data["updateNode"]
    assert out["milestoneGoal"] == "Second draft"


def test_update_milestone_preset_data_column():
    session = SessionLocal()
    try:
        session.query(Node).delete()
        session.query(Location).filter(Location.clerk_user_id == GRAPHQL_TEST_USER_ID).delete()
        session.commit()

        location = Location(
            name="Update MilestoneData Location", clerk_user_id=GRAPHQL_TEST_USER_ID
        )
        session.add(location)
        session.commit()
        session.refresh(location)
        location_id = location.id
    finally:
        session.close()

    campaign = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "workflow",
                "name": "Campaign",
                "parentId": None,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not campaign.errors, campaign.errors
    campaign_id = campaign.data["createNode"]["id"]

    milestone = asyncio.run(
        schema.execute(
            CREATE_NODE,
            variable_values={
                "locationId": location_id,
                "nodeType": "milestone",
                "name": "M",
                "parentId": campaign_id,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not milestone.errors, milestone.errors
    milestone_id = milestone.data["createNode"]["id"]

    updated = asyncio.run(
        schema.execute(
            UPDATE_NODE,
            variable_values={
                "id": milestone_id,
                "data": {"milestonePresetData": {"phase": "Second draft"}},
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not updated.errors, updated.errors
    out = updated.data["updateNode"]
    assert out["milestonePresetData"]["phase"] == "Second draft"


def test_get_handler_strips_node_type_for_lookup():
    from graphql.schema.node_handlers import get_handler
    from graphql.schema.node_handlers.milestone import MilestoneHandler

    assert isinstance(get_handler("  milestone  "), MilestoneHandler)
