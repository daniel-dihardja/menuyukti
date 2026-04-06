import strawberry

from graphql.schema.mutations import (
    CreateLocationMutation,
    CreateNodeMutation,
    UpdateMenuItemCogsBulkMutation,
    UploadSalesReportMutation,
)


@strawberry.type
class Mutation(
    UploadSalesReportMutation,
    CreateNodeMutation,
    CreateLocationMutation,
    UpdateMenuItemCogsBulkMutation,
):
    pass
