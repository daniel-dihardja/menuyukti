"""Wall-clock limits for heavy pandas / menuyukti compute in sync resolvers."""

from __future__ import annotations

import os
import signal
from collections.abc import Iterator
from contextlib import contextmanager

DEFAULT_COMPUTE_TIMEOUT_SECONDS = int(os.environ.get("GRAPHQL_COMPUTE_TIMEOUT_SECONDS", "120"))


@contextmanager
def compute_timeout(seconds: int | None = None) -> Iterator[None]:
    """Raise ``TimeoutError`` when compute exceeds ``seconds`` (Unix only)."""
    limit = seconds if seconds is not None else DEFAULT_COMPUTE_TIMEOUT_SECONDS
    if limit <= 0:
        yield
        return

    def _handler(_signum: int, _frame: object) -> None:
        msg = f"Analytics compute exceeded {limit}s"
        raise TimeoutError(msg)

    previous = signal.signal(signal.SIGALRM, _handler)
    signal.alarm(limit)
    try:
        yield
    finally:
        signal.alarm(0)
        signal.signal(signal.SIGALRM, previous)
