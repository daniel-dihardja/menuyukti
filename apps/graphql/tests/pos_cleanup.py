"""Shared POS teardown helpers for GraphQL tests.

``pos_fiscal_process.pos_order_id`` is ON DELETE RESTRICT, so bulk deletes of
``pos_order`` must remove fiscal rows (and lines) first. Opening a ticket starts
a fiscal sale process, including digital-menu submit.
"""

from __future__ import annotations

from collections.abc import Iterable

from sqlalchemy.orm import Session

from graphql.data_sources.models.analytics import AnalyticsRun, MenuItemCogs, OrderFact
from graphql.data_sources.models.calendar_entry import CalendarEntry
from graphql.data_sources.models.instagram import (
    InstagramPost,
    InstagramPostPage,
    InstagramPostPageMediaVersion,
)
from graphql.data_sources.models.location import Location
from graphql.data_sources.models.menu import Menu, MenuCategory, MenuItem
from graphql.data_sources.models.node import Node
from graphql.data_sources.models.pos_audit_event import PosAuditEvent
from graphql.data_sources.models.pos_bill_sequence import PosBillSequence
from graphql.data_sources.models.pos_fiscal_process import PosFiscalProcess
from graphql.data_sources.models.pos_order import PosOrder, PosOrderLine, PosOrderLineModifier
from graphql.data_sources.models.pos_register import PosRegister
from graphql.data_sources.models.service_subscription import ServiceSubscription
from graphql.data_sources.models.workspace import Workspace, WorkspaceMembership


def _as_int_ids(rows: Iterable) -> list[int]:
    # SQLAlchemy returns Row objects (indexable, not always tuple subclasses).
    return [int(row[0]) for row in rows]


def delete_pos_orders(
    session: Session,
    *,
    order_ids: Iterable[int] | None = None,
    location_ids: Iterable[int] | None = None,
    opened_by_clerk_user_ids: Iterable[str] | None = None,
) -> int:
    """Delete matching POS tickets and dependents (fiscal → lines → orders).

    Returns the number of ``pos_order`` rows deleted. Pass no filters to delete
    all POS tickets in the test DB.
    """
    q = session.query(PosOrder.id)
    if order_ids is not None:
        ids = list(order_ids)
        if not ids:
            return 0
        q = q.filter(PosOrder.id.in_(ids))
    if location_ids is not None:
        lids = list(location_ids)
        if not lids:
            return 0
        q = q.filter(PosOrder.location_id.in_(lids))
    if opened_by_clerk_user_ids is not None:
        users = list(opened_by_clerk_user_ids)
        if not users:
            return 0
        q = q.filter(PosOrder.opened_by_clerk_user_id.in_(users))

    resolved_ids = _as_int_ids(q.all())
    if not resolved_ids:
        return 0

    session.query(PosAuditEvent).filter(PosAuditEvent.pos_order_id.in_(resolved_ids)).delete(
        synchronize_session=False
    )
    session.query(PosFiscalProcess).filter(PosFiscalProcess.pos_order_id.in_(resolved_ids)).delete(
        synchronize_session=False
    )
    line_ids = _as_int_ids(
        session.query(PosOrderLine.id).filter(PosOrderLine.pos_order_id.in_(resolved_ids)).all()
    )
    if line_ids:
        session.query(PosOrderLineModifier).filter(
            PosOrderLineModifier.pos_order_line_id.in_(line_ids)
        ).delete(synchronize_session=False)
        session.query(PosOrderLine).filter(PosOrderLine.id.in_(line_ids)).delete(
            synchronize_session=False
        )
    deleted = (
        session.query(PosOrder)
        .filter(PosOrder.id.in_(resolved_ids))
        .delete(synchronize_session=False)
    )
    return int(deleted or 0)


def delete_all_pos_orders(session: Session) -> int:
    """Delete every POS ticket and dependents in the test DB.

    Also wipes orphan line/fiscal/audit rows that may remain if foreign keys were
    off for earlier deletes (SQLite test pollution).
    """
    session.query(PosAuditEvent).delete(synchronize_session=False)
    session.query(PosFiscalProcess).delete(synchronize_session=False)
    session.query(PosOrderLineModifier).delete(synchronize_session=False)
    session.query(PosOrderLine).delete(synchronize_session=False)
    deleted = session.query(PosOrder).delete(synchronize_session=False)
    return int(deleted or 0)


def clear_pos_for_locations(session: Session, location_ids: Iterable[int]) -> None:
    """Remove POS tickets plus register/bill-sequence rows for locations."""
    lids = [int(x) for x in location_ids]
    if not lids:
        return
    delete_pos_orders(session, location_ids=lids)
    session.query(PosAuditEvent).filter(PosAuditEvent.location_id.in_(lids)).delete(
        synchronize_session=False
    )
    session.query(PosBillSequence).filter(PosBillSequence.location_id.in_(lids)).delete(
        synchronize_session=False
    )
    session.query(PosRegister).filter(PosRegister.location_id.in_(lids)).delete(
        synchronize_session=False
    )


def clear_location_dependents(session: Session, location_ids: Iterable[int]) -> None:
    """Clear known location children so ``Location`` rows can be deleted under FK ON.

    Covers POS fiscal RESTRICT chains and tables that reference ``location`` without
    ``ON DELETE CASCADE`` (analytics runs, nodes, Instagram posts).
    """
    lids = [int(x) for x in location_ids]
    if not lids:
        return

    clear_pos_for_locations(session, lids)

    run_ids = _as_int_ids(
        session.query(AnalyticsRun.id).filter(AnalyticsRun.location_id.in_(lids)).all()
    )
    if run_ids:
        session.query(MenuItemCogs).filter(MenuItemCogs.analytics_run_id.in_(run_ids)).delete(
            synchronize_session=False
        )
        session.query(OrderFact).filter(OrderFact.analytics_run_id.in_(run_ids)).delete(
            synchronize_session=False
        )
        session.query(AnalyticsRun).filter(AnalyticsRun.id.in_(run_ids)).delete(
            synchronize_session=False
        )

    post_ids = _as_int_ids(
        session.query(InstagramPost.id).filter(InstagramPost.location_id.in_(lids)).all()
    )
    if post_ids:
        page_ids = _as_int_ids(
            session.query(InstagramPostPage.id)
            .filter(InstagramPostPage.post_id.in_(post_ids))
            .all()
        )
        if page_ids:
            session.query(InstagramPostPageMediaVersion).filter(
                InstagramPostPageMediaVersion.post_page_id.in_(page_ids)
            ).delete(synchronize_session=False)
            session.query(InstagramPostPage).filter(InstagramPostPage.id.in_(page_ids)).delete(
                synchronize_session=False
            )
        session.query(InstagramPost).filter(InstagramPost.id.in_(post_ids)).delete(
            synchronize_session=False
        )

    session.query(CalendarEntry).filter(CalendarEntry.location_id.in_(lids)).delete(
        synchronize_session=False
    )
    session.query(Node).filter(Node.location_id.in_(lids)).delete(synchronize_session=False)
    session.query(ServiceSubscription).filter(ServiceSubscription.location_id.in_(lids)).delete(
        synchronize_session=False
    )

    menu_ids = _as_int_ids(session.query(Menu.id).filter(Menu.location_id.in_(lids)).all())
    if menu_ids:
        session.query(MenuItem).filter(MenuItem.menu_id.in_(menu_ids)).delete(
            synchronize_session=False
        )
        session.query(MenuCategory).filter(MenuCategory.menu_id.in_(menu_ids)).delete(
            synchronize_session=False
        )
        session.query(Menu).filter(Menu.id.in_(menu_ids)).delete(synchronize_session=False)


def clear_workspaces_for_owners(session: Session, owner_clerk_user_ids: Iterable[str]) -> None:
    """Delete workspaces owned by ``owner_clerk_user_ids`` and blocking dependents.

    ``location.workspace_id`` and ``workspace_membership.workspace_id`` have no
    ``ON DELETE CASCADE``, so locations + all memberships must go first.
    """
    owners = [str(x) for x in owner_clerk_user_ids]
    if not owners:
        return

    workspace_ids = _as_int_ids(
        session.query(Workspace.id).filter(Workspace.owner_clerk_user_id.in_(owners)).all()
    )
    if not workspace_ids:
        return

    location_ids = _as_int_ids(
        session.query(Location.id).filter(Location.workspace_id.in_(workspace_ids)).all()
    )
    clear_location_dependents(session, location_ids)
    if location_ids:
        session.query(Location).filter(Location.id.in_(location_ids)).delete(
            synchronize_session=False
        )

    # Instagram posts also FK workspace without CASCADE.
    post_ids = _as_int_ids(
        session.query(InstagramPost.id)
        .filter(InstagramPost.workspace_id.in_(workspace_ids))
        .all()
    )
    if post_ids:
        page_ids = _as_int_ids(
            session.query(InstagramPostPage.id)
            .filter(InstagramPostPage.post_id.in_(post_ids))
            .all()
        )
        if page_ids:
            session.query(InstagramPostPageMediaVersion).filter(
                InstagramPostPageMediaVersion.post_page_id.in_(page_ids)
            ).delete(synchronize_session=False)
            session.query(InstagramPostPage).filter(InstagramPostPage.id.in_(page_ids)).delete(
                synchronize_session=False
            )
        session.query(InstagramPost).filter(InstagramPost.id.in_(post_ids)).delete(
            synchronize_session=False
        )

    session.query(ServiceSubscription).filter(
        ServiceSubscription.workspace_id.in_(workspace_ids)
    ).delete(synchronize_session=False)
    session.query(WorkspaceMembership).filter(
        WorkspaceMembership.workspace_id.in_(workspace_ids)
    ).delete(synchronize_session=False)
    session.query(Workspace).filter(Workspace.id.in_(workspace_ids)).delete(
        synchronize_session=False
    )
