import strawberry

from graphql.data_sources import Node, SessionLocal
from graphql.schema.auth import require_location_owner, user_id_from_info


@strawberry.type
class DeleteNodeMutation:
    @strawberry.mutation
    def delete_node(self, info: strawberry.Info, id: strawberry.ID) -> bool:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for deleteNode")

        try:
            node_pk = int(str(id))
        except ValueError as e:
            raise ValueError("Invalid node id") from e
        if node_pk < 1:
            raise ValueError("Invalid node id")

        session = SessionLocal()
        try:
            node = session.get(Node, node_pk)
            if node is None:
                raise ValueError("Node not found")

            if node.location_id is None:
                raise ValueError("Node has no location")

            require_location_owner(session, node.location_id, user_id)

            if node.node_type == "passcriteria":
                if node.parent_id is None:
                    raise ValueError("passcriteria has no parent")

                parent = session.get(Node, node.parent_id)
                if parent is None:
                    raise ValueError("Parent node not found")
                if parent.node_type != "milestone":
                    raise ValueError("passcriteria parent must be a milestone")
                if parent.location_id != node.location_id:
                    raise ValueError("Node location mismatch")

                session.delete(node)
            elif node.node_type == "milestone":
                if node.parent_id is None:
                    raise ValueError("Milestone has no parent")

                parent = session.get(Node, node.parent_id)
                if parent is None:
                    raise ValueError("Parent node not found")
                if parent.node_type != "campaign":
                    raise ValueError("Milestone parent must be a campaign")
                if parent.location_id != node.location_id:
                    raise ValueError("Node location mismatch")

                # Only the most recently created sibling milestone may be deleted (LIFO).
                last_sibling = (
                    session.query(Node)
                    .filter(
                        Node.location_id == node.location_id,
                        Node.parent_id == node.parent_id,
                        Node.node_type == "milestone",
                    )
                    .order_by(Node.created_at.desc(), Node.id.desc())
                    .first()
                )
                if last_sibling is None or last_sibling.id != node.id:
                    raise ValueError("Only the last milestone can be deleted")

                # Remove passcriteria children first (no DB-level cascade on parent_id).
                session.query(Node).filter(
                    Node.parent_id == node.id,
                    Node.node_type == "passcriteria",
                ).delete(synchronize_session=False)

                session.delete(node)
            else:
                raise ValueError("Only milestone and passcriteria nodes can be deleted with this mutation")
            session.commit()
            return True
        finally:
            session.close()
