import strawberry
from strawberry.scalars import JSON


@strawberry.type(
    description=(
        "A workflow tree node (workflow, milestone, etc.) stored in the polymorphic `node` table. "
        "Milestone-owned payloads also appear as typed fields (milestoneGoal, milestonePresetData, …)."
    )
)
class NodeType:
    id: strawberry.ID
    name: str
    description: str | None
    node_type: str
    path: str
    parent_id: strawberry.ID | None
    location_id: int | None
    data: JSON | None
    milestone_goal: str | None = None
    milestone_input: JSON | None = None
    pass_criterias: JSON | None = None
    milestone_preset_data: JSON | None = None
    milestone_result: JSON | None = None
