from langgraph.graph import StateGraph, END
from typing import TypedDict

from .config import (
    LANGSMITH_ENABLED,
    LANGCHAIN_API_KEY,
    LANGCHAIN_PROJECT,
    LANGCHAIN_ENDPOINT,
)

class AgentState(TypedDict):
    messages: list
    intent: str | None
    context: dict

# ─── LangSmith tracing ──────────────────────────────────────

def setup_langsmith():
    """Configure LangSmith environment variables for tracing."""
    if LANGSMITH_ENABLED and LANGCHAIN_API_KEY:
        os.environ["LANGCHAIN_TRACING_V2"] = "true"
        os.environ["LANGCHAIN_API_KEY"] = LANGCHAIN_API_KEY
        os.environ["LANGCHAIN_PROJECT"] = LANGCHAIN_PROJECT
        os.environ["LANGCHAIN_ENDPOINT"] = LANGCHAIN_ENDPOINT

# ─── Graph nodes ────────────────────────────────────────────

def intent_router(state: AgentState):
    # TODO: implement real intent classification
    return {"intent": "unknown"}

def compose_reply(state: AgentState):
    # TODO: implement real reply composition
    return {"messages": state["messages"] + [{"role": "assistant", "content": "TODO"}]}

def handoff(state: AgentState):
    # TODO: implement human handoff
    return {"messages": state["messages"]}

# ─── Build the graph ────────────────────────────────────────

graph = StateGraph(AgentState)

graph.add_node("intent_router", intent_router)
graph.add_node("compose_reply", compose_reply)
graph.add_node("handoff", handoff)

graph.set_entry_point("intent_router")
graph.add_conditional_edges(
    "intent_router",
    lambda s: "handoff" if s.get("intent") == "human" else "compose_reply",
    {"compose_reply": "compose_reply", "handoff": "handoff"}
)
graph.add_edge("compose_reply", END)
graph.add_edge("handoff", END)

setup_langsmith()
app = graph.compile()
