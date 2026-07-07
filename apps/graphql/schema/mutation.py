import strawberry

from graphql.schema.mutations import (
    CreateImageAiFlowMutation,
    CreateLocationMutation,
    CreateNodeMutation,
    CreatePostMutation,
    CreatePostPageMutation,
    CreateWorkflowFromPayloadMutation,
    CreateWorkspaceMutation,
    DeleteAnalyticsRunMutation,
    DeleteImageAiFlowMutation,
    DeleteNodeMutation,
    DeletePostMutation,
    DeletePostPageMediaVersionMutation,
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
    UpdatePostPageMutation,
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
    CreatePostMutation,
    CreatePostPageMutation,
    CreateWorkflowFromPayloadMutation,
    DeleteNodeMutation,
    DeletePostMutation,
    DeletePostPageMediaVersionMutation,
    UpdateNodeMutation,
    UpdatePostPageMutation,
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
