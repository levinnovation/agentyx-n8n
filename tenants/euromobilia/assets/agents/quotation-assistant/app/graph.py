from langgraph.graph import StateGraph, END
from typing import TypedDict, Annotated
import operator

# TODO: replace scaffolded nodes with production logic per
# tenants/euromobilia/domains/kitchen-commerce/capabilities/kitchen-quotation/policies.yaml

class AgentState(TypedDict):
    messages: Annotated[list, operator.add]
    intent: str | None
    context: dict
    handoff_reason: str | None

graph = StateGraph(AgentState)

def intent_router(state: AgentState):
    """Classify customer intent."""
    # TODO: implement real intent classification (appliance / furniture / full kitchen / other)
    return {"intent": "unknown"}

def catalog_lookup(state: AgentState):
    """Retrieve relevant catalog items."""
    # TODO: integrate catalog-rag retrieval
    return {"context": {"products": []}}

def compose_reply(state: AgentState):
    """Compose WhatsApp-safe quotation reply."""
    # TODO: implement reply composition with pricing from context
    return {"messages": [{"role": "assistant", "content": "Gracias por tu interés. Estoy preparando tu cotización. 📝"}]}

def handoff(state: AgentState):
    """Escalate to human agent."""
    # TODO: trigger human-handoff capability
    return {"messages": [{"role": "assistant", "content": "Te conecto con un asesor humano. 👤"}], "handoff_reason": "scaffolded"}

graph.add_node("intent_router", intent_router)
graph.add_node("catalog_lookup", catalog_lookup)
graph.add_node("compose_reply", compose_reply)
graph.add_node("handoff", handoff)

graph.set_entry_point("intent_router")
graph.add_conditional_edges(
    "intent_router",
    lambda s: "handoff" if s.get("intent") == "human" else "catalog_lookup",
    {"catalog_lookup": "catalog_lookup", "handoff": "handoff"}
)
graph.add_edge("catalog_lookup", "compose_reply")
graph.add_edge("compose_reply", END)
graph.add_edge("handoff", END)

app = graph.compile()
