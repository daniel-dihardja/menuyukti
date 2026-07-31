"""SQLAlchemy ORM models split by domain; imported by `database` for metadata registration."""

from graphql.data_sources.models.ai_usage_event import AiUsageEvent
from graphql.data_sources.models.analytics import AnalyticsRun, MenuItemCogs, OrderFact
from graphql.data_sources.models.calendar_entry import CalendarEntry
from graphql.data_sources.models.crm_app import CrmApp
from graphql.data_sources.models.crm_audit_event import CrmAuditEvent
from graphql.data_sources.models.crm_auth_challenge import CrmAuthChallenge
from graphql.data_sources.models.crm_cashback_entry import CrmCashbackEntry
from graphql.data_sources.models.crm_customer import CrmCustomer
from graphql.data_sources.models.crm_device import CrmDevice
from graphql.data_sources.models.crm_enrollment_token import CrmEnrollmentToken
from graphql.data_sources.models.image_ai_flow import ImageAiFlow
from graphql.data_sources.models.instagram import (
    InstagramPost,
    InstagramPostPage,
    InstagramPostPageMediaVersion,
)
from graphql.data_sources.models.location import Location
from graphql.data_sources.models.location_manual_brief_input import LocationManualBriefInput
from graphql.data_sources.models.location_opening_hour import LocationOpeningHour
from graphql.data_sources.models.media_asset import (
    MediaAsset,
    MediaCollection,
    MediaCollectionMember,
)
from graphql.data_sources.models.node import Node
from graphql.data_sources.models.visual_style import VisualStyle
from graphql.data_sources.models.workspace import Workspace, WorkspaceMembership

__all__ = [
    "AiUsageEvent",
    "AnalyticsRun",
    "CalendarEntry",
    "CrmApp",
    "CrmAuditEvent",
    "CrmAuthChallenge",
    "CrmCashbackEntry",
    "CrmCustomer",
    "CrmDevice",
    "CrmEnrollmentToken",
    "ImageAiFlow",
    "InstagramPost",
    "InstagramPostPage",
    "InstagramPostPageMediaVersion",
    "Location",
    "LocationOpeningHour",
    "LocationManualBriefInput",
    "MediaAsset",
    "MediaCollection",
    "MediaCollectionMember",
    "MenuItemCogs",
    "Node",
    "OrderFact",
    "VisualStyle",
    "Workspace",
    "WorkspaceMembership",
]
