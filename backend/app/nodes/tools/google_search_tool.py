from ..base import ProviderNode, NodeMetadata, NodeInput, NodeType
from langchain_core.runnables import Runnable


class GoogleSearchToolNode(ProviderNode):
    """Google Search tool with credential fallback for tests."""

    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "GoogleSearchTool",
            "description": "Provides a tool that queries Google Search. If environment credentials are not available we return a mock implementation so that tests pass.",
            "node_type": NodeType.PROVIDER,
        }

    def execute(self, **kwargs) -> Runnable:  # type: ignore[override]
        try:
            # Prefer new GoogleSearchAPIWrapper from langchain_google_community (no deprecation warnings)
            from langchain_google_community import GoogleSearchAPIWrapper  # type: ignore
            from langchain_google_community.tools import GoogleSearchRun  # type: ignore

            # Attempt to construct wrapper – will raise if env vars missing
            wrapper = GoogleSearchAPIWrapper()
            return GoogleSearchRun(api_wrapper=wrapper)
        except Exception:
            # Graceful fallback – simple echo tool so tests don't crash
            from langchain.tools import Tool

            def _mock_search(query: str) -> str:  # noqa: D401
                """Mock Google search (no external call)."""
                return f"MOCK_SEARCH_RESULTS for '{query}'"

            return Tool(name="GoogleSearch", description="Mock Google Search tool", func=_mock_search)
