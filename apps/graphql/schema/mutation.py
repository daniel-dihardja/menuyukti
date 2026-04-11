import strawberry

from graphql.schema.mutations import (
    CreateImageAiFlowMutation,
    CreateLocationMutation,
    CreateNodeMutation,
    CreateWorkspaceMutation,
    DeleteImageAiFlowMutation,
    DeleteNodeMutation,
    ExportWorkflowMutation,
    ImportWorkflowMutation,
    InviteWorkspaceMemberMutation,
    MilestoneAgentRunMutation,
    RemoveWorkspaceMemberMutation,
    ReplacePassCriteriaMutation,
    UpdateImageAiFlowMutation,
    UpdateMenuItemCogsBulkMutation,
    UpdateNodeMutation,
    UploadSalesReportMutation,
)


@strawberry.type(
    description=(
        "Root mutation: sales uploads, node CRUD, workflow import/export, workspace invites, "
        "and image AI flow configuration."
    )
)
class Mutation(
    UploadSalesReportMutation,
    CreateNodeMutation,
    DeleteNodeMutation,
    ExportWorkflowMutation,
    ImportWorkflowMutation,
    UpdateNodeMutation,
    ReplacePassCriteriaMutation,
    CreateLocationMutation,
    CreateWorkspaceMutation,
    InviteWorkspaceMemberMutation,
    MilestoneAgentRunMutation,
    RemoveWorkspaceMemberMutation,
    UpdateMenuItemCogsBulkMutation,
    CreateImageAiFlowMutation,
    UpdateImageAiFlowMutation,
    DeleteImageAiFlowMutation,
):
    pass
