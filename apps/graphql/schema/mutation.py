import strawberry

from graphql.schema.mutations import (
    CreateLocationMutation,
    CreateNodeMutation,
    DeleteNodeMutation,
    UpdateMenuItemCogsBulkMutation,
    UploadSalesReportMutation,
)


@strawberry.type
class Mutation(
    UploadSalesReportMutation,
    CreateNodeMutation,
    DeleteNodeMutation,
    CreateLocationMutation,
    UpdateMenuItemCogsBulkMutation,
):
    pass
