"""Query CRM customers (registrations) for an app."""

from __future__ import annotations

import strawberry
from sqlalchemy import func

from graphql.context import request_session_scope
from graphql.crm_auth.tokens import mask_phone_e164
from graphql.data_sources.models.crm_app import CrmApp
from graphql.data_sources.models.crm_customer import CrmCustomer
from graphql.data_sources.models.crm_device import CrmDevice
from graphql.schema.auth import is_workspace_member, user_id_from_info
from graphql.schema.types.crm_customer import CrmCustomerType


def _customer_to_gql(row: CrmCustomer, device_count: int) -> CrmCustomerType:
    return CrmCustomerType(
        id=row.id,
        phone_masked=mask_phone_e164(row.phone_e164),
        created_at=row.created_at,  # type: ignore[arg-type]
        device_count=device_count,
    )


@strawberry.type
class CrmCustomersQuery:
    @strawberry.field(
        description="List customers enrolled in a CRM app. Empty when missing or access denied."
    )
    def crm_customers(self, info: strawberry.Info, app_id: int) -> list[CrmCustomerType]:
        user_id = user_id_from_info(info)
        if not user_id:
            return []
        with request_session_scope(info) as session:
            app = session.query(CrmApp).filter(CrmApp.id == app_id).first()
            if app is None:
                return []
            if not is_workspace_member(session, app.workspace_id, user_id):
                return []

            device_count_sq = (
                session.query(
                    CrmDevice.customer_id.label("customer_id"),
                    func.count(CrmDevice.id).label("device_count"),
                )
                .group_by(CrmDevice.customer_id)
                .subquery()
            )
            rows = (
                session.query(CrmCustomer, func.coalesce(device_count_sq.c.device_count, 0))
                .outerjoin(device_count_sq, CrmCustomer.id == device_count_sq.c.customer_id)
                .filter(CrmCustomer.crm_app_id == app_id)
                .order_by(CrmCustomer.created_at.desc())
                .all()
            )
            return [_customer_to_gql(customer, int(count)) for customer, count in rows]
