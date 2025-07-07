from typing import Any

from ..base import ProviderNode, NodeMetadata, NodeType

# The Wikipedia tool depends on the third-party `wikipedia` package which may
# not be installed in all environments (e.g. CI). Attempt to import the real
# implementation, but gracefully fall back to a no-op stub when the dependency
# is missing so that the node can still be instantiated and workflows can run
# without external packages.

# Placeholder for the runnable instance (real or stub)
_WIKIPEDIA_RUNNABLE: Any = None

try:
    from langchain_community.tools import WikipediaQueryRun  # type: ignore
    from langchain_community.utilities import WikipediaAPIWrapper  # type: ignore
    from langchain_core.runnables import Runnable  # type: ignore

    _HAS_WIKIPEDIA = True
    _WIKIPEDIA_RUNNABLE = WikipediaQueryRun(api_wrapper=WikipediaAPIWrapper())  # type: ignore[arg-type]  # pragma: no cover

except Exception:
    _HAS_WIKIPEDIA = False
    from typing import Callable

    class _StubRunnable:  # noqa: D101 – simple stub
        """A minimal stub that mimics Runnable interface for tests."""

        def __call__(self, *args, **kwargs):  # noqa: D401, ANN001 – simple stub
            return "Wikipedia package not available."

        # Provide stream interface for compatibility
        async def astream(self, *args, **kwargs):  # noqa: ANN001
            yield self(*args, **kwargs)

    Runnable = _StubRunnable  # type: ignore[assignment]
    _WIKIPEDIA_RUNNABLE = _StubRunnable()

class WikipediaToolNode(ProviderNode):
    """LangGraph node for Wikipedia queries with graceful fallback."""

    def __init__(self):
        super().__init__()
        self._metadatas = {
            "name": "WikipediaTool",
            "description": (
                "Provides a tool that queries Wikipedia. If the optional"
                " `wikipedia` python package is not installed, a stub is"
                " returned instead so that workflows can still execute."
            ),
            "category": "Tools",
            "node_type": NodeType.PROVIDER,
        }

    def _execute(self, **kwargs) -> "Runnable":  # type: ignore[name-defined]
        """Return the real or stub runnable depending on availability."""
        return _WIKIPEDIA_RUNNABLE
