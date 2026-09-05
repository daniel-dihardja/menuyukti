from .award_crm_cashback import AwardCrmCashbackMutation
from .create_calendar_entry import CreateCalendarEntryMutation
from .create_crm_app import CreateCrmAppMutation
from .create_crm_enrollment_token import CreateCrmEnrollmentTokenMutation
from .create_location import CreateLocationMutation
from .create_media_collection import CreateMediaCollectionMutation
from .create_post import CreatePostMutation
from .create_post_page import CreatePostPageMutation
from .create_style import CreateStyleMutation
from .create_workspace import CreateWorkspaceMutation
from .delete_analytics_run import DeleteAnalyticsRunMutation
from .delete_calendar_entry import DeleteCalendarEntryMutation
from .delete_crm_app import DeleteCrmAppMutation
from .delete_crm_customer import DeleteCrmCustomerMutation
from .delete_media_collection import DeleteMediaCollectionMutation
from .delete_post import DeletePostMutation
from .delete_post_page import DeletePostPageMutation
from .delete_post_page_media_version import DeletePostPageMediaVersionMutation
from .delete_style import DeleteStyleMutation
from .inventory import InventoryCatalogMutations, InventoryStockMutations
from .invite_workspace_member import InviteWorkspaceMemberMutation
from .location_menu_item_cogs import (
    ApplyLocationCogsToAnalyticsRunMutation,
    SaveAnalyticsRunCogsToLocationMutation,
    UpsertLocationMenuItemCogsBulkMutation,
)
from .media_asset_catalog import DeleteMediaAssetMutation, EnsureMediaAssetMutation
from .media_collection_members import (
    AddMediaToCollectionMutation,
    RemoveMediaFromCollectionMutation,
)
from .record_ai_usage_event import RecordAiUsageEventMutation
from .remove_workspace_member import RemoveWorkspaceMemberMutation
from .revoke_crm_device import RevokeCrmDeviceMutation
from .update_calendar_entry import UpdateCalendarEntryMutation
from .update_crm_app import UpdateCrmAppMutation
from .update_location import UpdateLocationMutation
from .update_location_manual_brief_input import UpdateLocationManualBriefInputMutation
from .update_media_collection import UpdateMediaCollectionMutation
from .update_post import UpdatePostMutation
from .update_post_page import UpdatePostPageMutation
from .update_style import UpdateStyleMutation
from .upload_sales_report import UploadSalesReportMutation
from .upsert_menu_item_cogs_bulk import UpsertMenuItemCogsBulkMutation

__all__ = [
    "AwardCrmCashbackMutation",
    "AddMediaToCollectionMutation",
    "InventoryCatalogMutations",
    "InventoryStockMutations",
    "CreateCalendarEntryMutation",
    "CreateCrmAppMutation",
    "CreateCrmEnrollmentTokenMutation",
    "CreateLocationMutation",
    "CreateMediaCollectionMutation",
    "CreateStyleMutation",
    "CreatePostMutation",
    "CreatePostPageMutation",
    "CreateWorkspaceMutation",
    "DeleteAnalyticsRunMutation",
    "DeleteCalendarEntryMutation",
    "DeleteCrmAppMutation",
    "DeleteCrmCustomerMutation",
    "RevokeCrmDeviceMutation",
    "DeleteMediaAssetMutation",
    "DeleteMediaCollectionMutation",
    "DeleteStyleMutation",
    "DeletePostMutation",
    "DeletePostPageMutation",
    "DeletePostPageMediaVersionMutation",
    "EnsureMediaAssetMutation",
    "InviteWorkspaceMemberMutation",
    "RemoveMediaFromCollectionMutation",
    "RecordAiUsageEventMutation",
    "RemoveWorkspaceMemberMutation",
    "UpdateCalendarEntryMutation",
    "UpdateCrmAppMutation",
    "UpdateLocationMutation",
    "UpdateLocationManualBriefInputMutation",
    "UpdateMediaCollectionMutation",
    "UpdateStyleMutation",
    "UpdatePostMutation",
    "UpdatePostPageMutation",
    "UpsertMenuItemCogsBulkMutation",
    "UpsertLocationMenuItemCogsBulkMutation",
    "ApplyLocationCogsToAnalyticsRunMutation",
    "SaveAnalyticsRunCogsToLocationMutation",
    "UploadSalesReportMutation",
]
