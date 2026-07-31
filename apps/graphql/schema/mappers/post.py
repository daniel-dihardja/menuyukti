"""ORM → GraphQL mappers for Instagram posts."""

from __future__ import annotations

import strawberry
from graphql.data_sources import InstagramPost
from graphql.schema.types import PostPageMediaVersionType, PostPageType, PostType


def media_version_to_gql(row) -> PostPageMediaVersionType:
    return PostPageMediaVersionType(
        id=strawberry.ID(str(row.id)),
        media_s3_key=row.media_s3_key,
        prompt=row.prompt,
        created_at=row.created_at,
    )


def post_page_to_gql(row) -> PostPageType:
    versions = list(row.media_versions) if row.media_versions else []
    versions.sort(key=lambda version: (version.created_at, version.id), reverse=True)
    return PostPageType(
        id=strawberry.ID(str(row.id)),
        sort_order=row.sort_order,
        media_s3_key=row.media_s3_key,
        prompt=row.prompt,
        image_format=row.image_format,
        image_quality=row.image_quality,
        generation_model=row.generation_model,
        media_versions=[media_version_to_gql(version) for version in versions],
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def post_to_gql(row: InstagramPost) -> PostType:
    pages = sorted(row.pages, key=lambda p: p.sort_order) if row.pages else []
    return PostType(
        id=strawberry.ID(str(row.id)),
        title=row.title,
        status=row.status,
        caption=row.caption,
        media_type=row.media_type,
        location_id=row.location_id,
        workspace_id=strawberry.ID(str(row.workspace_id)) if row.workspace_id is not None else None,
        pages=[post_page_to_gql(page) for page in pages],
        created_at=row.created_at,
        updated_at=row.updated_at,
    )
