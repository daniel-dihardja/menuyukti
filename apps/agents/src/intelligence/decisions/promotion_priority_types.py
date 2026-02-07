from enum import Enum


class PromotionPriority(str, Enum):
    """
    Priority level for promotion execution.

    This determines HOW MUCH attention
    an opportunity deserves relative to others.

    It is intentionally coarse-grained.
    """

    CRITICAL = "critical"
    """
    Top-tier opportunity.

    MEANING:
        - Core profit driver
        - High economic impact
        - Should not be missed
    """

    HIGH = "high"
    """
    Strong opportunity.

    MEANING:
        - Clear upside
        - Safe to promote
        - Should be scheduled intentionally
    """

    MEDIUM = "medium"
    """
    Optional opportunity.

    MEANING:
        - Use if capacity allows
        - Good secondary content
    """

    LOW = "low"
    """
    Minimal or defensive opportunity.

    MEANING:
        - Avoid if possible
        - Only for baseline presence
    """
