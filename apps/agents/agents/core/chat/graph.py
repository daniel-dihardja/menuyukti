"""LangGraph chat graph (single LLM node, MessagesState)."""

from agents_app.agents.core.chat.prompts import build_system_prompt
from agents_app.models.llm_config import get_llm
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import MessagesState


async def _chat_node(
    state: MessagesState,
    *,
    workflow_id: str | None = None,
    milestone_id: str | None = None,
) -> dict[str, list[BaseMessage]]:
    """Stream tokens from the model; LangGraph surfaces them via astream_events."""
    llm = get_llm()
    system = SystemMessage(
        content=build_system_prompt(workflow_id, milestone_id=milestone_id),
    )
    messages: list[BaseMessage] = [system, *state["messages"]]
    full_content = ""
    async for chunk in llm.astream(messages):
        text = chunk.content
        if isinstance(text, str):
            full_content += text
        elif isinstance(text, list):
            # Multimodal / block content: best-effort string concat
            full_content += "".join(str(part) for part in text)
    return {"messages": [AIMessage(content=full_content)]}


def build_chat_graph(workflow_id: str | None = None, milestone_id: str | None = None):
    """Compile a stateless chat graph (no checkpointer)."""
    builder = StateGraph(MessagesState)

    async def chat_node(state: MessagesState) -> dict[str, list[BaseMessage]]:
        return await _chat_node(state, workflow_id=workflow_id, milestone_id=milestone_id)

    builder.add_node("chat", chat_node)
    builder.add_edge(START, "chat")
    builder.add_edge("chat", END)
    return builder.compile()


def messages_from_roles(messages: list[dict[str, str]]) -> list[BaseMessage]:
    """Map API message dicts to LangChain messages (user / assistant only)."""
    out: list[BaseMessage] = []
    for m in messages:
        role = m["role"]
        content = m["content"]
        if role == "user":
            out.append(HumanMessage(content=content))
        elif role == "assistant":
            out.append(AIMessage(content=content))
        else:
            msg = f"Invalid message role: {role}"
            raise ValueError(msg)
    return out
