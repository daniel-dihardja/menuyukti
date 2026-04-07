import strawberry

from graphql.schema.mutations import (
    CreateLocationMutation,
    CreateNodeMutation,
    CreateWorkspaceMutation,
    DeleteNodeMutation,
    InviteWorkspaceMemberMutation,
    RemoveWorkspaceMemberMutation,
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
    CreateWorkspaceMutation,
    InviteWorkspaceMemberMutation,
    RemoveWorkspaceMemberMutation,
    UpdateMenuItemCogsBulkMutation,
):
    pass
