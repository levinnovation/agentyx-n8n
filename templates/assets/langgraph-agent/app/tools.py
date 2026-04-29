from langchain.tools import tool

@tool
def example_tool(query: str) -> str:
    """Example tool — replace with real tools."""
    return f"Result for {query}"
