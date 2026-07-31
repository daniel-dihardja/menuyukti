"""Instagram post load helpers."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from graphql.data_sources import InstagramPost, InstagramPostPage
from graphql.schema.auth import is_workspace_member
from graphql.services.workspace_scope import workspace_ids_for_user


def load_post_for_user(session: Session, post_pk: int, user_id: str) -> InstagramPost | None:
    row = session.scalars(
        select(InstagramPost)
        .options(
            joinedload(InstagramPost.pages).joinedload(InstagramPostPage.media_versions),
        )
        .where(InstagramPost.id == post_pk)
    ).first()
    if row is None:
        return None
    if row.workspace_id is None:
        return None
    if not is_workspace_member(session, row.workspace_id, user_id):
        return None
    return row


def list_posts_for_user(session: Session, user_id: str, *, limit: int) -> list[InstagramPost]:
    workspace_ids = workspace_ids_for_user(session, user_id)
    if not workspace_ids:
        return []
    return list(
        session.scalars(
            select(InstagramPost)
            .options(
                joinedload(InstagramPost.pages).joinedload(InstagramPostPage.media_versions),
            )
            .where(InstagramPost.workspace_id.in_(workspace_ids))
            .order_by(InstagramPost.updated_at.desc(), InstagramPost.id.desc())
            .limit(limit)
        )
        .unique()
        .all()
    )
