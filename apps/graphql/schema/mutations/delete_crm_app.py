"""Delete a workspace CRM app."""

from __future__ import annotations

import strawberry

from graphql.context import request_session_scope
from graphql.data_sources.models.crm_app import CrmApp
from graphql.schema.auth import is_workspace_member, user_id_from_info


@strawberry.type
class DeleteCrmAppMutation:
    @strawberry.mutation(description="Delete a CRM app by id.")
    def delete_crm_app(self, info: strawberry.Info, id: int) -> bool:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for deleteCrmApp")

        with request_session_scope(info) as session:
            row = session.query(CrmApp).filter(CrmApp.id == id).first()
            if row is None:
                raise ValueError("CRM app not found")
            if not is_workspace_member(session, row.workspace_id, user_id):
                raise PermissionError("Not allowed to delete this CRM app")
            session.delete(row)
            session.commit()
            return True
