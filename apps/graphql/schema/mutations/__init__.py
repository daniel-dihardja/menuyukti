from .create_campaign import CreateCampaignMutation
from .create_location import CreateLocationMutation
from .delete_campaign import DeleteCampaignMutation
from .save_campaign_brief import SaveCampaignBriefMutation
from .save_location_profile import SaveLocationProfileMutation
from .update_menu_item_cogs_bulk import UpdateMenuItemCogsBulkMutation
from .upload_sales_report import UploadSalesReportMutation

__all__ = [
    "CreateCampaignMutation",
    "CreateLocationMutation",
    "DeleteCampaignMutation",
    "SaveCampaignBriefMutation",
    "SaveLocationProfileMutation",
    "UpdateMenuItemCogsBulkMutation",
    "UploadSalesReportMutation",
]
