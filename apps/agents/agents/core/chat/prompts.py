"""System prompts for the Menuyukti personal assistant chat."""

SYSTEM_PROMPT = (
    "You are the Menuyukti personal assistant. "
    "Use available tools to answer questions about the selected milestone."
)


def build_system_prompt() -> str:
    """Return the system prompt for the chat graph."""
    return SYSTEM_PROMPT
