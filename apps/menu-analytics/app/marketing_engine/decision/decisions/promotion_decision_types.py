from enum import Enum


class PromotionDecision(str, Enum):
    """
    Final deterministic decision for promotion execution.

    This enum represents the LAST step of reasoning
    before execution layers (scheduler, agents).

    IMPORTANT:
    - Decisions are binary enough to act on.
    - No probabilities.
    - No scores.
    - No ambiguity.
    """

    PROMOTE = "promote"
    """
    Strong, approved opportunity.

    MEANING:
        Act now.
        Allocate attention.
        Safe to execute.
    """

    CONSIDER = "consider"
    """
    Acceptable but not urgent opportunity.

    MEANING:
        Use as filler.
        Secondary priority.
        Optional execution.
    """

    DO_NOT_PROMOTE = "do_not_promote"
    """
    Blocked or low-value opportunity.

    MEANING:
        Do not allocate attention.
        Avoid wasting marketing resources.
    """
