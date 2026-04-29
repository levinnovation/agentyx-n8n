from langchain.tools import tool

@tool
def search_catalog(query: str, top_k: int = 5) -> str:
    """Search the product catalog for relevant items."""
    # TODO: integrate with catalog-rag asset
    return f"Found {top_k} products for '{query}' (TODO)"

@tool
def sync_to_crm(lead: dict) -> str:
    """Sync lead information to Bitrix24."""
    # TODO: integrate with bitrix24 asset
    return "Lead synced (TODO)"

@tool
def notify_slack(message: str) -> str:
    """Send internal notification to Slack."""
    # TODO: integrate with slack asset
    return "Notification sent (TODO)"
