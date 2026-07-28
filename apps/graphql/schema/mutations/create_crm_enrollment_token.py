"""Mint a short-lived CRM enrollment token for QR / deep-link enroll."""

from __future__ import annotations

import secrets
from datetime import UTC, datetime, timedelta

import strawberry

from graphql.context import request_session_scope
from graphql.crm_auth.tokens import build_enroll_url, hash_enrollment_token
from graphql.data_sources.models.crm_app import CrmApp
from graphql.data_sources.models.crm_enrollment_token import CrmEnrollmentToken
from graphql.schema.auth import is_workspace_member, user_id_from_info
from graphql.schema.types.crm_enrollment_token import CrmEnrollmentTokenCreatedType

ENROLLMENT_TOKEN_TTL = timedelta(minutes=5)


@strawberry.type
class CreateCrmEnrollmentTokenMutation:
    @strawberry.mutation(
        description=(
            "Create a single-use enrollment token for a CRM app. "
            "Returns the raw token once; expires in 5 minutes."
        )
    )
    def create_crm_enrollment_token(
        self, info: strawberry.Info, app_id: int
    ) -> CrmEnrollmentTokenCreatedType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for createCrmEnrollmentToken")

        with request_session_scope(info) as session:
            app = session.query(CrmApp).filter(CrmApp.id == app_id).first()
            if app is None:
                raise ValueError("CRM app not found")
            if not is_workspace_member(session, app.workspace_id, user_id):
                raise PermissionError("Not allowed to create enrollment tokens for this CRM app")

            raw_token = secrets.token_urlsafe(32)
            expires_at = datetime.now(tz=UTC) + ENROLLMENT_TOKEN_TTL
            row = CrmEnrollmentToken(
                crm_app_id=app.id,
                token_hash=hash_enrollment_token(raw_token),
                created_by_clerk_user_id=user_id,
                expires_at=expires_at,
            )
            session.add(row)
            session.commit()

            app_uuid = str(app.app_id)
            return CrmEnrollmentTokenCreatedType(
                token=raw_token,
                expires_at=expires_at,
                enroll_url=build_enroll_url(token=raw_token, app_id=app_uuid),
            )
