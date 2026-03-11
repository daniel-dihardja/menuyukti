"""Generic reflect-loop pattern for agentic generation pipelines.

Usage::

    summary, log = await reflect_loop(
        generate=lambda: llm.ainvoke(prompt),
        reflect=lambda draft: reflector_llm.ainvoke(reflection_prompt(draft)),
        revise=lambda draft, feedback: llm.ainvoke(revision_prompt(draft, feedback)),
        on_event=lambda status, label: _emit("my_step", status, label, config),
        max_iterations=2,
    )
"""

import logging
from typing import Any, Awaitable, Callable, Literal, Protocol

from agent.state import ReflectionIteration

logger = logging.getLogger(__name__)


class ReflectResult(Protocol):
    """Structural protocol for the object returned by the reflect callable."""

    verdict: Literal["pass", "revise"]
    feedback: list[str] | None


async def reflect_loop(
    *,
    generate: Callable[[], Awaitable[str]],
    reflect: Callable[[str], Awaitable[Any]],
    revise: Callable[[str, list[str]], Awaitable[str]],
    on_event: Callable[[str, str], Awaitable[None]],
    max_iterations: int = 2,
) -> tuple[str, list[ReflectionIteration]]:
    """Run a generate → reflect → revise loop, returning the final draft and the iteration log.

    Args:
        generate: Async callable that produces the initial draft (no arguments).
        reflect: Async callable that evaluates a draft and returns an object satisfying
            ``ReflectResult`` (i.e. has ``.verdict`` and ``.feedback``).
        revise: Async callable ``(draft, feedback_bullets) -> improved_draft``.
        on_event: Async callable ``(status, label)`` used to stream progress events.
            Statuses emitted: "generating", "reflecting", "reflect_pass", "reflect_revise".
        max_iterations: Maximum number of reflect-and-revise cycles. The generator is
            always called at least once; the reflector is called at most ``max_iterations``
            times. If the cap is reached the last draft is accepted unconditionally.

    Returns:
        A ``(final_draft, log)`` tuple where ``log`` contains one ``ReflectionIteration``
        per generation attempt.
    """
    reflection_log: list[ReflectionIteration] = []

    for iteration in range(max_iterations + 1):
        await on_event("generating", f"Generating location profile (attempt {iteration + 1} of {max_iterations + 1})...")
        draft = await generate() if iteration == 0 else await revise(draft, feedback_bullets)  # type: ignore[possibly-undefined]

        if iteration >= max_iterations:
            logger.info("reflect_loop: reached max iterations (%d), accepting final draft", max_iterations)
            await on_event("reflect_pass", f"Accepted final draft after {iteration} revision(s)")
            reflection_log.append(ReflectionIteration(iteration=iteration, verdict="pass", feedback=[], draft=draft))
            break

        await on_event("reflecting", "Evaluating location profile quality...")
        result = await reflect(draft)

        if result.verdict == "pass":
            logger.info("reflect_loop: passed on iteration %d", iteration)
            await on_event("reflect_pass", f"Draft passed quality review on iteration {iteration + 1}")
            reflection_log.append(ReflectionIteration(iteration=iteration, verdict="pass", feedback=[], draft=draft))
            break

        feedback_bullets: list[str] = result.feedback or []
        feedback_text = "; ".join(feedback_bullets)
        logger.info("reflect_loop: revision requested on iteration %d:\n%s", iteration, "\n".join(f"- {f}" for f in feedback_bullets))
        await on_event("reflect_revise", f"Revising: {feedback_text}")
        reflection_log.append(ReflectionIteration(iteration=iteration, verdict="revise", feedback=feedback_bullets, draft=draft))

    return draft, reflection_log  # type: ignore[possibly-undefined]
