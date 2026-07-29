"""Delete a CRM customer registration (and cascaded devices)."""

from __future__ import annotations

import uuid

import strawberry

from graphql.context import request_session_scope
from graphql.crm_auth.audit import record_audit_event
from graphql.data_sources.models.crm_app import CrmApp
from graphql.data_sources.models.crm_customer import CrmCustomer
from graphql.schema.auth import is_workspace_member, user_id_from_info


@strawberry.type
class DeleteCrmCustomerMutation:
    @strawberry.mutation(
        description="Delete a CRM customer registration by id. Cascades enrolled devices."
    )
    def delete_crm_customer(self, info: strawberry.Info, id: uuid.UUID) -> bool:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for deleteCrmCustomer")

        with request_session_scope(info) as session:
            customer = session.query(CrmCustomer).filter(CrmCustomer.id == id).first()
            if customer is None:
                raise ValueError("CRM customer not found")
            app = session.query(CrmApp).filter(CrmApp.id == customer.crm_app_id).first()
            if app is None:
                raise ValueError("CRM app not found")
            if not is_workspace_member(session, app.workspace_id, user_id):
                raise PermissionError("Not allowed to delete this CRM customer")
            record_audit_event(
                session,
                event_type="customer_delete",
                crm_app_id=app.id,
                customer_id=customer.id,
                detail=f"by:{user_id}",
            )
            session.delete(customer)
            session.commit()
            return True
