"""ORM → GraphQL mappers for playbooks."""

from __future__ import annotations

from graphql.data_sources.models.playbook import Playbook
from graphql.schema.types.playbook import PlaybookType


def playbook_to_gql(row: Playbook) -> PlaybookType:
    return PlaybookType(
        id=row.id,
        location_id=row.location_id,
        name=row.name,
        playbook_type=row.playbook_type,
        start_date=row.start_date,
        end_date=row.end_date,
    )
