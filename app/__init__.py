"""Shim package to ensure `import app.*` works regardless of working directory.

It makes the repository root importable by adding the backend directory to
`sys.path` if not already and delegates attribute access to the actual
`backend/app` package implemented for the server.
"""

from __future__ import annotations

import importlib
import pathlib
import sys
from types import ModuleType
from typing import Any

# Absolute path to the backend directory (two levels up from this file)
_shim_dir = pathlib.Path(__file__).resolve().parent  # .../repo/app
_backend_dir = _shim_dir.parent / "backend"
_app_dir = _backend_dir / "app"

# Prepend backend directory to sys.path so that `import app.*` resolves
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

# Lazily import the real app package when any attribute is requested
_real_app: ModuleType | None = None

def _load_real_app() -> ModuleType:  # noqa: D401
    """Import and cache backend.app as the real implementation."""
    global _real_app  # noqa: PLW0603
    if _real_app is None:
        _real_app = importlib.import_module("backend.app")
    return _real_app

# Expose backend/app as importable submodules via this shim
__path__: list[str] = [str(_app_dir)]  # type: ignore[var-annotated]

# Proxy attribute access to backend.app

def __getattr__(name: str) -> Any:  # noqa: D401
    real = _load_real_app()
    return getattr(real, name)


def __dir__() -> list[str]:  # noqa: D401
    real = _load_real_app()
    return dir(real) 