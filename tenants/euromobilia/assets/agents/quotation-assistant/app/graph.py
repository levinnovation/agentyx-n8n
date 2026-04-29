"""
LangGraph agent for the Euromobilia Quotation Assistant.

Graph topology:
  START → ensure_kb → agent → (tools → agent)* → END

Preserves:
- OpenRouter free-fallback tiers
- LangSmith tracing
- Parallel tool execution
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Annotated, Sequence, TypedDict

from langchain_core.messages import (
    BaseMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
)
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages

from .config import (
    LLM_API_KEY,
    LLM_BASE_URL,
    LLM_MODEL,
    OPENROUTER_BASE_URL,
    LANGCHAIN_API_KEY,
    LANGCHAIN_PROJECT,
    get_fallback_models,
)

logger = logging.getLogger(__name__)

# ─── Load system prompt from versioned .md file ──────────────

_PROMPT_PATH = Path(__file__).parent.parent / ".." / ".." / "prompts" / "quotation-assistant.system.md"


def _load_system_prompt() -> str:
    path = _PROMPT_PATH.resolve()
    if path.exists():
        return path.read_text(encoding="utf-8")
    logger.warning("System prompt not found at %s — using fallback", path)
    return "You are the Euromobilia Quotation Assistant."


SYSTEM_PROMPT = _load_system_prompt()


# ─── LangSmith tracing ──────────────────────────────────────

def setup_langsmith():
    """Configure LangSmith environment variables for tracing."""
    if LANGCHAIN_API_KEY:
        os.environ["LANGCHAIN_TRACING_V2"] = "true"
        os.environ["LANGCHAIN_API_KEY"] = LANGCHAIN_API_KEY
        os.environ["LANGCHAIN_PROJECT"] = LANGCHAIN_PROJECT
        os.environ["LANGCHAIN_ENDPOINT"] = "https://api.smith.langchain.com"


# ─── Parallel Tool Executor ─────────────────────────────────

def _build_parallel_tool_node(tools: list):
    """Build a graph node that executes tool calls in parallel."""
    from concurrent.futures import ThreadPoolExecutor, as_completed
    import traceback as _tb

    tool_map = {t.name: t for t in tools}

    def parallel_tools(state):
        last_msg = state["messages"][-1]
        tool_calls = getattr(last_msg, "tool_calls", []) or []
        if not tool_calls:
            return state

        results = [None] * len(tool_calls)

        def _run_one(idx, tc):
            name = tc["name"]
            args = tc["args"]
            tool = tool_map.get(name)
            if not tool:
                return idx, ToolMessage(
                    content=f"Error: tool '{name}' not found",
                    tool_call_id=tc["id"],
                )
            try:
                output = tool.invoke(args)
                return idx, ToolMessage(
                    content=str(output),
                    tool_call_id=tc["id"],
                )
            except Exception as e:
                _tb.print_exc()
                return idx, ToolMessage(
                    content=f"Error executing {name}: {e}",
                    tool_call_id=tc["id"],
                )

        with ThreadPoolExecutor(max_workers=min(len(tool_calls), 8)) as executor:
            futures = [
                executor.submit(_run_one, i, tc)
                for i, tc in enumerate(tool_calls)
            ]
            for future in as_completed(futures):
                idx, msg = future.result()
                results[idx] = msg

        return {"messages": results}

    return parallel_tools


# ─── LLM builder ────────────────────────────────────────────

def _build_llm(model: str, api_key: str, base_url: str | None) -> ChatOpenAI:
    kwargs = dict(
        model=model,
        openai_api_key=api_key,
        temperature=0.2,
        streaming=True,
        max_tokens=4096,
    )
    if base_url:
        kwargs["openai_api_base"] = base_url
    return ChatOpenAI(**kwargs)


def _is_openrouter_error(exc: Exception) -> bool:
    msg = str(exc).lower()
    markers = [
        "credit", "credits", "insufficient", "rate_limit", "rate limit",
        "quota", "billing", "payment", "402", "429", "exceeded",
        "no credits", "out of credits",
    ]
    return any(m in msg for m in markers)


# ─── Agent State ────────────────────────────────────────────

class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]


# ─── Build the graph ────────────────────────────────────────

def build_agent_graph(tools: list) -> StateGraph:
    """Build and compile the LangGraph agent."""
    setup_langsmith()

    primary_llm = _build_llm(LLM_MODEL, LLM_API_KEY, LLM_BASE_URL)
    primary_with_tools = primary_llm.bind_tools(tools)

    def ensure_kb(state: AgentState) -> AgentState:
        """Load FAISS index if not already in memory."""
        from knowledge.sync import ensure_index_loaded
        ensure_index_loaded()
        return state

    def agent_node(state: AgentState) -> AgentState:
        messages = list(state["messages"])
        if not messages or not isinstance(messages[0], SystemMessage):
            messages = [SystemMessage(content=SYSTEM_PROMPT)] + messages
        try:
            response = primary_with_tools.invoke(messages)
        except Exception as exc:
            if _is_openrouter_error(exc):
                fallbacks = get_fallback_models(LLM_MODEL)
                for fb in fallbacks:
                    try:
                        fb_llm = _build_llm(fb, LLM_API_KEY, OPENROUTER_BASE_URL)
                        fb_with_tools = fb_llm.bind_tools(tools)
                        response = fb_with_tools.invoke(messages)
                        logger.info("Fallback model %s succeeded", fb)
                        break
                    except Exception as fb_exc:
                        logger.warning("Fallback %s failed: %s", fb, fb_exc)
                        continue
                else:
                    raise
            else:
                raise
        return {"messages": [response]}

    def should_continue(state: AgentState) -> str:
        last_message = state["messages"][-1]
        if hasattr(last_message, "tool_calls") and last_message.tool_calls:
            return "tools"
        return "end"

    parallel_tool_node = _build_parallel_tool_node(tools)

    graph = StateGraph(AgentState)
    graph.add_node("ensure_kb", ensure_kb)
    graph.add_node("agent", agent_node)
    graph.add_node("tools", parallel_tool_node)

    graph.set_entry_point("ensure_kb")
    graph.add_edge("ensure_kb", "agent")
    graph.add_conditional_edges(
        "agent",
        should_continue,
        {"tools": "tools", "end": END},
    )
    graph.add_edge("tools", "agent")

    return graph.compile()


# ─── Singleton compiled graph ───────────────────────────────

_compiled_graph = None


def get_agent(tools: list):
    """Get or create the compiled agent graph (singleton)."""
    global _compiled_graph
    if _compiled_graph is None:
        _compiled_graph = build_agent_graph(tools)
    return _compiled_graph


def invoke_agent(
    user_message: str,
    tools: list,
    history: list[BaseMessage] | None = None,
    context: str = "",
) -> dict:
    """Invoke the agent with a user message."""
    agent = get_agent(tools)
    messages: list[BaseMessage] = []
    if history:
        messages.extend(history)
    if context:
        messages.append(SystemMessage(content=f"[CONTEXT]\n{context}"))
    messages.append(HumanMessage(content=user_message))
    result = agent.invoke(
        {"messages": messages},
        config={"run_name": "Euromobilia Quotation"},
    )
    return result
