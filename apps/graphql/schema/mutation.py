import strawberry

from graphql.schema.mutations import (
    CreateLocationMutation,
    UpdateMenuItemCogsBulkMutation,
    UploadSalesReportMutation,
)


@strawberry.type
class Mutation(
    UploadSalesReportMutation,
    CreateLocationMutation,
    UpdateMenuItemCogsBulkMutation,
):
    pass
