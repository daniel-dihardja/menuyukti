import strawberry

from graphql.schema.mutations import (
    CreateCampaignMutation,
    CreateLocationMutation,
    DeleteCampaignMutation,
    DeleteCampaignBriefMutation,
    DeleteLocationProfileMutation,
    SaveCampaignBriefMutation,
    SaveLocationProfileMutation,
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
):
    pass
