from enum import Enum


class RoleType(str, Enum):
    """
    Semantic economic roles assigned to menu items.

    IMPORTANT:
    Roles describe STRATEGIC IDENTITY — not temporary behavior.

    They compress complex economic signals into stable labels
    that agents and decision engines can reason about safely.

    Roles must remain:

        - deterministic
        - interpretable
        - stable over time
    """

    # -----------------------------------------------------
    # CORE ROLES (Start with these — do not add more yet)
    # -----------------------------------------------------

    PROFIT_ANCHOR = "profit_anchor"
    """
    Items responsible for a significant share of total profit.

    STRATEGIC MEANING:
        Protect aggressively.
        Avoid discounting.
        Ensure availability.

    Often among the most dangerous items to lose.
    """

    GROWTH_LEVER = "growth_lever"
    """
    High-margin items with untapped demand potential.

    STRATEGIC MEANING:
        Promote.
        Improve visibility.
        Feature in campaigns.

    Typically the safest path to incremental profit.
    """

    VELOCITY_DRIVER = "velocity_driver"
    """
    Items generating profit rapidly due to strong sales.

    STRATEGIC MEANING:
        Feature regularly.
        Use to stabilize revenue.
        Monitor operational capacity.
    """

    TRAFFIC_DRIVER = "traffic_driver"
    """
    High-volume items that attract customers.

    STRATEGIC MEANING:
        Use for bundles and upsells.
        Optimize attach rates.

    Traffic without margin still has strategic value.
    """

    DRAG = "drag"
    """
    Low-margin AND low-volume items.

    STRATEGIC MEANING:
        Avoid promoting.
        Consider removal or reformulation.

    These dilute menu efficiency.
    """
