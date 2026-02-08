from pydantic import BaseModel
from datetime import time
from typing import Optional

from app.decision.decisions.promotion_priority_types import PromotionPriority


class ScheduledPost(BaseModel):
    """
    Represents a single scheduled social media post.

    This is execution-ready output.
    """

    day: str  # mon, tue, wed, ...
    time: time  # exact posting time

    menu: str
    menu_category: str

    priority: PromotionPriority

    reason: str  # why this item was scheduled
    expected_behavior: str  # what this post should achieve

    source_candidate: Optional[str] = None
    """
    Optional reference to the originating promotion candidate
    (menu name or id). Useful for debugging and traceability.
    """
