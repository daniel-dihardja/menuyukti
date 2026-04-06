"""OpenAI chat model configuration."""

import os

from langchain_openai import ChatOpenAI


def get_llm() -> ChatOpenAI:
    """Return a streaming ChatOpenAI client (reads OPENAI_API_KEY from the environment)."""
    model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
    return ChatOpenAI(
        model=model,
        temperature=0,
        streaming=True,
    )
