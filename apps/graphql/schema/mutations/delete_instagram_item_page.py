"""Delete an empty page/frame from a workflow Instagram item."""

from __future__ import annotations

from datetime import UTC, datetime

import strawberry
from sqlalchemy.orm import joinedload

from graphql.context import request_session_scope
from graphql.data_sources import InstagramItem, InstagramItemPage
from graphql.schema.auth import user_id_from_info
from graphql.schema.instagram_items_common import load_page_for_owner, parse_positive_id


@strawberry.type
class DeleteInstagramItemPageMutation:
    @strawberry.mutation
    def delete_instagram_item_page(self, info: strawberry.Info, page_id: strawberry.ID) -> bool:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for deleteInstagramItemPage")

        page_pk = parse_positive_id(page_id, label="instagram item page id")

        with request_session_scope(info) as session:
            page_row = load_page_for_owner(session, page_pk, user_id)
            item_pk = page_row.instagram_item_id

            item_row = session.get(
                InstagramItem,
                item_pk,
                options=[joinedload(InstagramItem.pages)],
            )
            if item_row is None:
                raise ValueError("Instagram item not found")

            pages = list(item_row.pages) if item_row.pages else []
            if len(pages) <= 1:
                raise ValueError("Instagram item must keep at least one page")

            if page_row.media_s3_key is not None or page_row.media_versions:
                raise ValueError("Cannot delete a page that has generated images")

            session.delete(page_row)
            session.flush()

            remaining_pages = (
                session.query(InstagramItemPage)
                .filter(InstagramItemPage.instagram_item_id == item_pk)
                .order_by(InstagramItemPage.sort_order, InstagramItemPage.id)
                .all()
            )
            for index, remaining_page in enumerate(remaining_pages):
                remaining_page.sort_order = index

            item_row.updated_at = datetime.now(tz=UTC)
            session.commit()
            return True
