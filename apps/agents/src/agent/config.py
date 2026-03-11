"""Agent configuration loaded from environment variables."""

import os

LLM_MODEL = os.environ.get("LLM_MODEL", "gpt-4o-mini")
