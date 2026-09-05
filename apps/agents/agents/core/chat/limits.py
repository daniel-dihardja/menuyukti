"""Shared chat ReAct / history limits."""

# Max tool/model turns per request (ReAct loop budget).
CHAT_RECURSION_LIMIT = 20

# Approximate token budget for model-bound history (checkpoint retains full thread).
CHAT_HISTORY_MAX_TOKENS = 60_000

# Log when checkpoint messages exceed this count (observability only).
CHAT_HISTORY_LOG_MESSAGE_THRESHOLD = 80
