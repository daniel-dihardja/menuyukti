"""Delete an empty page/slide from an Instagram post."""

from __future__ import annotations

from datetime import UTC, datetime

import strawberry
from sqlalchemy.orm import joinedload

from graphql.context import request_session_scope
from graphql.data_sources import InstagramPost, InstagramPostPage
from graphql.schema.auth import user_id_from_info
from graphql.services.posts import load_post_for_user as _load_post_for_user


@strawberry.type
class DeletePostPageMutation:
    @strawberry.mutation
    def delete_post_page(self, info: strawberry.Info, page_id: strawberry.ID) -> bool:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for deletePostPage")

        try:
            page_pk = int(str(page_id))
        except ValueError as e:
            raise ValueError("Invalid post page id") from e
        if page_pk < 1:
            raise ValueError("Invalid post page id")

        with request_session_scope(info) as session:
            page_row = session.get(
                InstagramPostPage,
                page_pk,
                options=[joinedload(InstagramPostPage.media_versions)],
            )
            if page_row is None:
                raise ValueError("Post page not found")

            post_row = _load_post_for_user(session, page_row.post_id, user_id)
            if post_row is None:
                raise PermissionError("Not allowed to delete this post page")

            pages = list(post_row.pages) if post_row.pages else []
            if len(pages) <= 1:
                raise ValueError("Post must keep at least one page")

            if page_row.media_s3_key is not None or page_row.media_versions:
                raise ValueError("Cannot delete a page that has generated images")

            post_pk = page_row.post_id
            session.delete(page_row)
            session.flush()

            remaining_pages = (
                session.query(InstagramPostPage)
                .filter(InstagramPostPage.post_id == post_pk)
                .order_by(InstagramPostPage.sort_order, InstagramPostPage.id)
                .all()
            )
            for index, remaining_page in enumerate(remaining_pages):
                remaining_page.sort_order = index

            post_row = session.get(InstagramPost, post_pk)
            if post_row is not None:
                post_row.updated_at = datetime.now(tz=UTC)

            session.commit()
            return True
