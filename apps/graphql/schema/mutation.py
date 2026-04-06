import strawberry

from graphql.schema.mutations import (
    CreateLocationMutation,
    CreateNodeMutation,
    DeleteNodeMutation,
    UpdateMenuItemCogsBulkMutation,
    UpdateNodeMutation,
    UploadSalesReportMutation,
)


@strawberry.type
class Mutation(
    UploadSalesReportMutation,
    CreateNodeMutation,
    DeleteNodeMutation,
    UpdateNodeMutation,
    CreateLocationMutation,
    UpdateMenuItemCogsBulkMutation,
):
    pass
