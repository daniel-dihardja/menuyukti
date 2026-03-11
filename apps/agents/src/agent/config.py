"""Agent configuration loaded from environment variables."""

import os

LLM_MODEL = os.environ.get("LLM_MODEL", "gpt-4o-mini")
REFLECT_MAX_ITERATIONS = int(os.environ.get("REFLECT_MAX_ITERATIONS", "2"))
