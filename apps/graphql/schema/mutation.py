import strawberry

from graphql.schema.mutations import (
    CreateLocationMutation,
    SaveOperatingSummaryMutation,
    UpdateMenuItemCogsBulkMutation,
    UploadSalesReportMutation,
)


@strawberry.type
class Mutation(
    UploadSalesReportMutation,
    CreateLocationMutation,
    UpdateMenuItemCogsBulkMutation,
    SaveOperatingSummaryMutation,
):
    pass
