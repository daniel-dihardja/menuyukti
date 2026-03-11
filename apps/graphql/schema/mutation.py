import strawberry

from graphql.schema.mutations import (
    CreateLocationMutation,
    SaveLocationProfileMutation,
    UpdateMenuItemCogsBulkMutation,
    UploadSalesReportMutation,
)


@strawberry.type
class Mutation(
    UploadSalesReportMutation,
    CreateLocationMutation,
    UpdateMenuItemCogsBulkMutation,
    SaveLocationProfileMutation,
):
    pass
