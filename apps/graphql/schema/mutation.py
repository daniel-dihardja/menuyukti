import strawberry

from graphql.schema.mutations import (
    CreateCampaignMutation,
    CreateLocationMutation,
    DeleteCampaignBriefMutation,
    DeleteCampaignMutation,
    DeleteLocationProfileMutation,
    SaveCampaignBriefMutation,
    SaveLocationProfileMutation,
    SavePromotionCandidatesMutation,
    UpdateMenuItemCogsBulkMutation,
    UploadSalesReportMutation,
)


@strawberry.type
class Mutation(
    UploadSalesReportMutation,
    CreateLocationMutation,
    CreateCampaignMutation,
    DeleteCampaignMutation,
    DeleteCampaignBriefMutation,
    DeleteLocationProfileMutation,
    UpdateMenuItemCogsBulkMutation,
    SaveLocationProfileMutation,
    SaveCampaignBriefMutation,
    SavePromotionCandidatesMutation,
):
    pass
