from langgraph.graph import StateGraph, END
from typing import TypedDict

class AgentState(TypedDict):
    messages: list
    intent: str | None
    context: dict

graph = StateGraph(AgentState)

def intent_router(state: AgentState):
    # TODO: implement real intent classification
    return {"intent": "unknown"}

def compose_reply(state: AgentState):
    # TODO: implement real reply composition
    return {"messages": state["messages"] + [{"role": "assistant", "content": "TODO"}]}

def handoff(state: AgentState):
    # TODO: implement human handoff
    return {"messages": state["messages"]}

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

app = graph.compile()
