"""Central limits for GraphQL validation, list pagination, and uploads."""

import os

# Query execution guards (used by schema extensions in schema/__init__.py)
QUERY_MAX_DEPTH = 12
QUERY_MAX_ALIASES = 30
QUERY_MAX_TOKENS = 8000
QUERY_MAX_FIELD_SELECTIONS = 4000

# nodes(locationId: …)
DEFAULT_NODES_FIRST = 500
MAX_NODES_FIRST = 500

# analyticsRuns(locationId: …)
DEFAULT_ANALYTICS_RUNS_FIRST = 100
MAX_ANALYTICS_RUNS_FIRST = 300

# uploadSalesReport — total request body / file size cap
_DEFAULT_UPLOAD_BYTES = 30 * 1024 * 1024  # 30 MiB
MAX_SALES_REPORT_UPLOAD_BYTES = int(
    os.environ.get("MAX_SALES_REPORT_UPLOAD_BYTES", str(_DEFAULT_UPLOAD_BYTES))
)


def clamp_page_size(requested: int | None, *, default: int, maximum: int) -> int:
    """Interpret None as default; clamp to [1, maximum]."""
    n = default if requested is None else requested
    if n < 1:
        return 1
    return min(n, maximum)
