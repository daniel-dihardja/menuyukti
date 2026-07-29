"""Query CRM customers (registrations) for an app."""

from __future__ import annotations

import uuid

import strawberry
from sqlalchemy import func, or_

from graphql.context import request_session_scope
from graphql.data_sources.models.crm_app import CrmApp
from graphql.data_sources.models.crm_customer import CrmCustomer
from graphql.data_sources.models.crm_device import CrmDevice
from graphql.schema.auth import is_workspace_member, user_id_from_info
from graphql.schema.crm_customer_map import customer_to_gql, load_customer_cashback
from graphql.schema.types.crm_customer import CrmCustomerType


def _escape_like(term: str) -> str:
    return term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


@strawberry.type
class CrmCustomersQuery:
    @strawberry.field(
        description="List customers enrolled in a CRM app. Empty when missing or access denied."
    )
    def crm_customers(
        self,
        info: strawberry.Info,
        app_id: int,
        search: str | None = None,
    ) -> list[CrmCustomerType]:
        user_id = user_id_from_info(info)
        if not user_id:
            return []
        with request_session_scope(info) as session:
            app = session.query(CrmApp).filter(CrmApp.id == app_id).first()
            if app is None:
                return []
            if not is_workspace_member(session, app.workspace_id, user_id):
                return []

            q = session.query(CrmCustomer).filter(CrmCustomer.crm_app_id == app_id)
            if search is not None and search.strip():
                needle = f"%{_escape_like(search.strip().lower())}%"
                q = q.filter(
                    or_(
                        func.lower(func.coalesce(CrmCustomer.phone_e164, "")).like(
                            needle, escape="\\"
                        ),
                        func.lower(func.coalesce(CrmCustomer.given_name, "")).like(
                            needle, escape="\\"
                        ),
                        func.lower(func.coalesce(CrmCustomer.family_name, "")).like(
                            needle, escape="\\"
                        ),
                    )
                )
            customers = q.order_by(CrmCustomer.created_at.desc()).all()
            if not customers:
                return []

            customer_ids = [c.id for c in customers]
            devices = (
                session.query(CrmDevice).filter(CrmDevice.customer_id.in_(customer_ids)).all()
            )
            by_customer: dict[uuid.UUID, list[CrmDevice]] = {cid: [] for cid in customer_ids}
            for device in devices:
                by_customer.setdefault(device.customer_id, []).append(device)

            return [
                customer_to_gql(c, devices=by_customer.get(c.id, []), include_devices=False)
                for c in customers
            ]

    @strawberry.field(
        description="CRM customer detail with devices. Null when missing or access denied."
    )
    def crm_customer(self, info: strawberry.Info, id: uuid.UUID) -> CrmCustomerType | None:
        user_id = user_id_from_info(info)
        if not user_id:
            return None
        with request_session_scope(info) as session:
            customer = session.query(CrmCustomer).filter(CrmCustomer.id == id).first()
            if customer is None:
                return None
            app = session.query(CrmApp).filter(CrmApp.id == customer.crm_app_id).first()
            if app is None:
                return None
            if not is_workspace_member(session, app.workspace_id, user_id):
                return None

            devices = (
                session.query(CrmDevice)
                .filter(CrmDevice.customer_id == customer.id)
                .order_by(CrmDevice.created_at.desc())
                .all()
            )
            balance, entries = load_customer_cashback(session, customer.id)
            return customer_to_gql(
                customer,
                devices=devices,
                include_devices=True,
                cashback_balance=balance,
                cashback_entries=entries,
                include_cashback=True,
            )
