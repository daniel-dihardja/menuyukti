"""Pytest fixtures and env defaults for agents tests."""

import os

# Chat graph compiles at app lifespan and instantiates ChatOpenAI; avoid requiring a real key in CI.
os.environ.setdefault("AI_GATEWAY_API_KEY", "test-key-agents-ci-not-for-production")
