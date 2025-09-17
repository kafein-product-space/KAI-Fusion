"""Backwards compatibility module for memory service."""

# Import everything from the new memory package
from .memory import *

# This ensures that existing imports like:
# from app.services.memory import db_memory_store
# will continue to work without breaking existing code.