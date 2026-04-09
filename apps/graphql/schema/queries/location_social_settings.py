"""Optional brand voice and hashtag defaults per location."""

from __future__ import annotations

import strawberry

from graphql.data_sources import LocationSocialSettings, SessionLocal
from graphql.schema.auth import is_location_owner, user_id_from_info


def _coerce_str_list(raw: object | None) -> list[str]:
    if raw is None:
        return []
    if not isinstance(raw, list):
        return []
    return [str(x) for x in raw if x is not None]


@strawberry.type
class LocationSocialSettingsType:
    locationId: int
    tone: str | None
    brandPersonality: str | None
    contentPillars: list[str]
    platformFocus: list[str]
    brandHashtags: list[str]
    avoidTopics: list[str]
    targetAudience: str | None


@strawberry.type
class LocationSocialSettingsQuery:
    @strawberry.field(
        description=(
            "Social and brand-voice settings for a location. "
            "Returns empty lists and null strings when no row exists."
        )
    )
    def location_social_settings(
        self,
        info: strawberry.Info,
        location_id: int,
    ) -> LocationSocialSettingsType | None:
        user_id = user_id_from_info(info)
        with SessionLocal() as session:
            if not is_location_owner(session, location_id, user_id):
                return None
            row = (
                session.query(LocationSocialSettings)
                .filter(LocationSocialSettings.location_id == location_id)
                .first()
            )
            if row is None:
                return LocationSocialSettingsType(
                    locationId=location_id,
                    tone=None,
                    brandPersonality=None,
                    contentPillars=[],
                    platformFocus=[],
                    brandHashtags=[],
                    avoidTopics=[],
                    targetAudience=None,
                )
            return LocationSocialSettingsType(
                locationId=location_id,
                tone=row.tone,
                brandPersonality=row.brand_personality,
                contentPillars=_coerce_str_list(row.content_pillars),
                platformFocus=_coerce_str_list(row.platform_focus),
                brandHashtags=_coerce_str_list(row.brand_hashtags),
                avoidTopics=_coerce_str_list(row.avoid_topics),
                targetAudience=row.target_audience,
            )
