import sys
import pathlib

# Ensure project root and backend directory are on sys.path so that
# `import app.*` works during pytest collection regardless of where
# the tests are invoked from.

PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[2]
BACKEND_DIR = PROJECT_ROOT / "backend"

for p in (PROJECT_ROOT, BACKEND_DIR):
    if str(p) not in sys.path:
        sys.path.insert(0, str(p)) 