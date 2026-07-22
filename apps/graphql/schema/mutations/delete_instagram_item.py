"""Delete a workflow-scoped Instagram item."""

from __future__ import annotations

import strawberry

from graphql.context import request_session_scope
from graphql.schema.auth import user_id_from_info
from graphql.schema.instagram_items_common import load_item_for_owner, parse_positive_id


@strawberry.type
class DeleteInstagramItemMutation:
    @strawberry.mutation
    def delete_instagram_item(self, info: strawberry.Info, id: strawberry.ID) -> bool:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for deleteInstagramItem")

        item_pk = parse_positive_id(id, label="instagram item id")

        with request_session_scope(info) as session:
            row = load_item_for_owner(session, item_pk, user_id)
            session.delete(row)
            session.commit()
            return True
