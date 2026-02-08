from typing import Set

from app.intelligence.roles.role_types import RoleType
from app.intelligence.enrichment.enriched_menu_item import EnrichedMenuItem


# ---------------------------------------------------------
# Threshold Configuration
#
# Keep thresholds centralized so they can be tuned
# without rewriting logic.
# ---------------------------------------------------------

PROFIT_ANCHOR_THRESHOLD = 0.10
HIGH_MARGIN_THRESHOLD = 1.2
LOW_MARGIN_THRESHOLD = 0.8
HIGH_VOLUME_THRESHOLD = 1.2
LOW_VOLUME_THRESHOLD = 0.8
HIGH_VELOCITY_THRESHOLD = 1.3


def assign_roles(item: EnrichedMenuItem) -> Set[RoleType]:
    """
    Assign deterministic economic roles to an enriched menu item.

    Roles compress complex primitives into stable strategic identities,
    enabling safer downstream reasoning by agents and decision engines.

    IMPORTANT:
    This function must remain deterministic and explainable.
    """

    roles: Set[RoleType] = set()

    econ = item.economic

    # -----------------------------------------------------
    # PROFIT ANCHOR
    # -----------------------------------------------------
    if econ.contribution_share >= PROFIT_ANCHOR_THRESHOLD:
        roles.add(RoleType.PROFIT_ANCHOR)

    # -----------------------------------------------------
    # GROWTH LEVER
    #
    # High margin but relatively lower adoption.
    # Often the SAFEST items to promote.
    # -----------------------------------------------------
    if (
        econ.margin_strength >= HIGH_MARGIN_THRESHOLD
        and econ.volume_strength <= LOW_VOLUME_THRESHOLD
    ):
        roles.add(RoleType.GROWTH_LEVER)

    # -----------------------------------------------------
    # VELOCITY DRIVER
    #
    # Generates profit quickly.
    # -----------------------------------------------------
    if econ.profit_velocity >= HIGH_VELOCITY_THRESHOLD:
        roles.add(RoleType.VELOCITY_DRIVER)

    # -----------------------------------------------------
    # TRAFFIC DRIVER
    #
    # Popular items — even if margin is weaker.
    # -----------------------------------------------------
    if (
        econ.volume_strength >= HIGH_VOLUME_THRESHOLD
        and econ.margin_strength < HIGH_MARGIN_THRESHOLD
    ):
        roles.add(RoleType.TRAFFIC_DRIVER)

    # -----------------------------------------------------
    # DRAG
    #
    # Weak across both axes.
    # -----------------------------------------------------
    if (
        econ.margin_strength <= LOW_MARGIN_THRESHOLD
        and econ.volume_strength <= LOW_VOLUME_THRESHOLD
    ):
        roles.add(RoleType.DRAG)

    return roles
