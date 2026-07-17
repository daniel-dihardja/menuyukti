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
    DeletePostPageMutation,
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
    UpdatePostMutation,
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
    DeletePostPageMutation,
    DeletePostPageMediaVersionMutation,
    UpdateNodeMutation,
    UpdatePostMutation,
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
