"""API package exports.

Routers that depend on the database (auth, workflows, credentials, executions, etc.)
are only imported when the database layer is enabled. This prevents optional
packages such as *email-validator* from being required in database-disabled
development mode.
"""

import os

DISABLE_DATABASE = os.getenv("DISABLE_DATABASE", "false").lower() == "true"

# Always-available router
from . import nodes  # noqa: F401 – exposed via __all__

# Conditionally import database-dependent routers
if not DISABLE_DATABASE:
    from . import auth  # noqa: F401
    from . import workflows  # noqa: F401
    from . import credentials  # noqa: F401

# Export symbols
__all__ = ["nodes"]
if not DISABLE_DATABASE:
    __all__ += ["auth", "workflows", "credentials"]
