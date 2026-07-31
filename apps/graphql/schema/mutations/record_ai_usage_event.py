"""Record an AI usage event for the authenticated user."""

from __future__ import annotations

import re
from typing import Any

import strawberry
from strawberry.scalars import JSON

from graphql.context import request_session_scope
from graphql.data_sources.models.ai_usage_event import AiUsageEvent
from graphql.schema.auth import user_id_from_info
from graphql.schema.types.ai_usage import AiUsageEventType

_ALLOWED_PROVIDERS = frozenset({"leonardo", "ai_gateway"})
_ALLOWED_STATUSES = frozenset({"succeeded", "failed"})
_FEATURE_RE = re.compile(r"^[a-z][a-z0-9_]{0,62}$")
_MAX_UNITS = 1_000_000


def _event_to_gql(row: AiUsageEvent) -> AiUsageEventType:
    created = row.created_at.isoformat() if row.created_at else ""
    return AiUsageEventType(
        id=str(row.id),
        provider=row.provider,
        feature=row.feature,
        model=row.model,
        external_id=row.external_id,
        units=row.units,
        status=row.status,
        created_at=created,
    )


@strawberry.type
class RecordAiUsageEventMutation:
    @strawberry.mutation(
        description=(
            "Append an AI usage ledger row for the authenticated user "
            "(Leonardo generations and similar)."
        )
    )
    def record_ai_usage_event(
        self,
        info: strawberry.Info,
        provider: str,
        feature: str,
        status: str,
        model: str | None = None,
        external_id: str | None = None,
        units: int = 1,
        metadata: JSON | None = None,
    ) -> AiUsageEventType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for recordAiUsageEvent")

        provider_clean = provider.strip().lower()
        if provider_clean not in _ALLOWED_PROVIDERS:
            raise ValueError(f"Unsupported provider: {provider!r}")

        feature_clean = feature.strip().lower()
        if not _FEATURE_RE.match(feature_clean):
            raise ValueError(f"Invalid feature: {feature!r}")

        status_clean = status.strip().lower()
        if status_clean not in _ALLOWED_STATUSES:
            raise ValueError(f"Invalid status: {status!r}")

        if units < 1 or units > _MAX_UNITS:
            raise ValueError(f"units must be between 1 and {_MAX_UNITS}")

        model_clean = (model or "").strip() or None
        if model_clean is not None and len(model_clean) > 128:
            raise ValueError("model is too long")

        external_clean = (external_id or "").strip() or None
        if external_clean is not None and len(external_clean) > 256:
            raise ValueError("externalId is too long")

        meta: dict[str, Any] | None = None
        if metadata is not None:
            if not isinstance(metadata, dict):
                raise ValueError("metadata must be a JSON object")
            if len(metadata) > 20:
                raise ValueError("metadata has too many keys")
            meta = {str(k)[:64]: v for k, v in list(metadata.items())[:20]}

        with request_session_scope(info) as session:
            row = AiUsageEvent(
                user_id=user_id,
                provider=provider_clean,
                feature=feature_clean,
                model=model_clean,
                external_id=external_clean,
                units=units,
                status=status_clean,
                event_metadata=meta,
            )
            session.add(row)
            session.commit()
            session.refresh(row)
            return _event_to_gql(row)
