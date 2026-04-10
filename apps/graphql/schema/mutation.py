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
    UpdateImageAiFlowMutation,
    UpdateMenuItemCogsBulkMutation,
    UpdateNodeMutation,
    UploadSalesReportMutation,
)


@strawberry.type
class Mutation(
    UploadSalesReportMutation,
    CreateNodeMutation,
    DeleteNodeMutation,
    ExportWorkflowMutation,
    ImportWorkflowMutation,
    UpdateNodeMutation,
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
