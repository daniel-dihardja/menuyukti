import strawberry

from graphql.schema.mutations import (
    CreateApiAdapterToolMutation,
    CreateImageAiFlowMutation,
    CreateLocationMutation,
    CreateNodeMutation,
    CreateWorkspaceMutation,
    DeleteAnalyticsRunMutation,
    DeleteApiAdapterToolMutation,
    DeleteImageAiFlowMutation,
    DeleteNodeMutation,
    ExportWorkflowMutation,
    ImportWorkflowMutation,
    InviteWorkspaceMemberMutation,
    MilestoneAgentRunMutation,
    RemoveWorkspaceMemberMutation,
    ReplacePassCriteriaMutation,
    UpdateApiAdapterToolMutation,
    UpdateImageAiFlowMutation,
    UpdateLocationManualBriefInputMutation,
    UpdateLocationMutation,
    UpdateMenuItemCogsBulkMutation,
    UpdateNodeMutation,
    UploadSalesReportMutation,
    UpsertMenuItemCogsBulkMutation,
)


@strawberry.type(
    description=(
        "Root mutation: sales uploads, node CRUD, workflow import/export, workspace invites, "
        "workspace API adapter tools, and image AI flow configuration."
    )
)
class Mutation(
    CreateApiAdapterToolMutation,
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
    UpsertMenuItemCogsBulkMutation,
    UpdateMenuItemCogsBulkMutation,
    CreateImageAiFlowMutation,
    UpdateImageAiFlowMutation,
    DeleteApiAdapterToolMutation,
    DeleteAnalyticsRunMutation,
    DeleteImageAiFlowMutation,
    UpdateApiAdapterToolMutation,
    UpdateLocationMutation,
    UpdateLocationManualBriefInputMutation,
):
    pass
