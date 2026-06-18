import strawberry

from graphql.schema.mutations import (
    CreateImageAiFlowMutation,
    CreateLocationMutation,
    CreateNodeMutation,
    CreateWorkflowFromPayloadMutation,
    CreateWorkspaceMutation,
    DeleteAnalyticsRunMutation,
    DeleteImageAiFlowMutation,
    DeleteNodeMutation,
    InviteWorkspaceMemberMutation,
    MilestoneAgentRunMutation,
    RemoveWorkspaceMemberMutation,
    ReorderMilestonesMutation,
    ReplacePassCriteriaMutation,
    SetPassCriteriaStatusesMutation,
    SetPassCriterionStatusMutation,
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
        "Root mutation: sales uploads, node CRUD, workflow templates, workspace invites, "
        "and image AI flow configuration."
    )
)
class Mutation(
    UploadSalesReportMutation,
    CreateNodeMutation,
    CreateWorkflowFromPayloadMutation,
    DeleteNodeMutation,
    UpdateNodeMutation,
    ReplacePassCriteriaMutation,
    SetPassCriterionStatusMutation,
    SetPassCriteriaStatusesMutation,
    ReorderMilestonesMutation,
    CreateLocationMutation,
    CreateWorkspaceMutation,
    InviteWorkspaceMemberMutation,
    MilestoneAgentRunMutation,
    RemoveWorkspaceMemberMutation,
    UpsertMenuItemCogsBulkMutation,
    UpdateMenuItemCogsBulkMutation,
    CreateImageAiFlowMutation,
    UpdateImageAiFlowMutation,
    DeleteAnalyticsRunMutation,
    DeleteImageAiFlowMutation,
    UpdateLocationMutation,
    UpdateLocationManualBriefInputMutation,
):
    pass
