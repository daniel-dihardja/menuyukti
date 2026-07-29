"""Staff mutation to revoke a CRM customer device."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

import strawberry

from graphql.context import request_session_scope
from graphql.crm_auth.audit import record_audit_event
from graphql.crm_auth.http_util import clear_refresh_token
from graphql.data_sources.models.crm_app import CrmApp
from graphql.data_sources.models.crm_customer import CrmCustomer
from graphql.data_sources.models.crm_device import CrmDevice
from graphql.schema.auth import is_workspace_member, user_id_from_info
from graphql.schema.crm_customer_map import device_to_gql
from graphql.schema.types.crm_device import CrmDeviceType


@strawberry.type
class RevokeCrmDeviceMutation:
    @strawberry.mutation(
        description=(
            "Revoke a CRM device so it can no longer authenticate. "
            "Clears refresh token hash. Idempotent if already revoked."
        )
    )
    def revoke_crm_device(self, info: strawberry.Info, device_id: uuid.UUID) -> CrmDeviceType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for revokeCrmDevice")

        now = datetime.now(tz=UTC)
        with request_session_scope(info) as session:
            device = session.query(CrmDevice).filter(CrmDevice.id == device_id).first()
            if device is None:
                raise ValueError("CRM device not found")
            customer = (
                session.query(CrmCustomer).filter(CrmCustomer.id == device.customer_id).first()
            )
            if customer is None:
                raise ValueError("CRM customer not found")
            app = session.query(CrmApp).filter(CrmApp.id == customer.crm_app_id).first()
            if app is None:
                raise ValueError("CRM app not found")
            if not is_workspace_member(session, app.workspace_id, user_id):
                raise PermissionError("Not allowed to revoke this CRM device")

            if device.revoked_at is None:
                device.revoked_at = now
            clear_refresh_token(device)
            record_audit_event(
                session,
                event_type="revoke_staff",
                crm_app_id=app.id,
                customer_id=customer.id,
                device_id=device.id,
                detail=f"by:{user_id}",
            )
            session.commit()
            session.refresh(device)
            return device_to_gql(device)
