import strawberry

from graphql.schema.mutations import (
    CreateImageAiFlowMutation,
    CreateLocationMutation,
    CreateNodeMutation,
    CreateWorkspaceMutation,
    DeleteImageAiFlowMutation,
    DeleteNodeMutation,
    ExportCampaignMutation,
    ImportCampaignMutation,
    InviteWorkspaceMemberMutation,
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
    ExportCampaignMutation,
    ImportCampaignMutation,
    UpdateNodeMutation,
    CreateLocationMutation,
    CreateWorkspaceMutation,
    InviteWorkspaceMemberMutation,
    RemoveWorkspaceMemberMutation,
    UpdateMenuItemCogsBulkMutation,
    CreateImageAiFlowMutation,
    UpdateImageAiFlowMutation,
    DeleteImageAiFlowMutation,
):
    pass
