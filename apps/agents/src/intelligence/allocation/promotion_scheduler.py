from typing import List
from datetime import time

from intelligence.decisions.promotion_candidate import PromotionCandidate
from intelligence.decisions.promotion_decision_types import PromotionDecision
from intelligence.allocation.scheduled_post import ScheduledPost


DEFAULT_POST_DAYS = ["mon", "wed", "fri"]


class PromotionScheduler:
    """
    Deterministic scheduler that allocates promotion candidates
    into a weekly posting plan.

    This is NOT an AI component.
    It is an allocation engine.
    """

    def __init__(self, post_days: List[str] = None):
        self.post_days = post_days or DEFAULT_POST_DAYS

    def build_weekly_schedule(
        self,
        candidates: List[PromotionCandidate],
    ) -> List[ScheduledPost]:
        """
        Build a weekly Instagram schedule.

        Steps:
        1. Filter PROMOTE candidates
        2. Rank by priority and economic weight
        3. Assign to days
        4. Avoid category repetition
        """

        # -----------------------------------------
        # 1. Filter promotion-ready candidates
        # -----------------------------------------
        promotable = [c for c in candidates if c.decision == PromotionDecision.PROMOTE]

        if not promotable:
            return []

        # -----------------------------------------
        # 2. Rank candidates
        # -----------------------------------------
        promotable.sort(
            key=lambda c: (
                c.priority.value,  # CRITICAL < HIGH < MEDIUM < LOW
                -c.economic_weight,
            )
        )

        schedule: List[ScheduledPost] = []
        last_category = None

        # -----------------------------------------
        # 3. Allocate to days
        # -----------------------------------------
        for day in self.post_days:
            candidate = self._select_candidate(
                promotable,
                last_category,
            )

            if not candidate:
                break

            post = ScheduledPost(
                day=day,
                time=candidate.recommended_post_time,
                menu=candidate.menu,
                menu_category=candidate.menu_category,
                priority=candidate.priority,
                reason=candidate.decision_reason,
                expected_behavior=candidate.expected_behavior,
                source_candidate=candidate.menu,
            )

            schedule.append(post)
            promotable.remove(candidate)
            last_category = candidate.menu_category

        return schedule

    # -------------------------------------------------
    # Internal helpers
    # -------------------------------------------------

    def _select_candidate(
        self,
        candidates: List[PromotionCandidate],
        last_category: str | None,
    ) -> PromotionCandidate | None:
        """
        Select the next best candidate,
        avoiding category repetition when possible.
        """

        if not candidates:
            return None

        # Prefer a different category than last post
        for c in candidates:
            if c.menu_category != last_category:
                return c

        # Fallback: allow repetition
        return candidates[0]
