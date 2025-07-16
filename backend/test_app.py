#!/usr/bin/env python3
"""
Minimal test application for App Runner debugging
"""
import sys
import os

print("=== App Runner Debug Test ===")
print(f"Python version: {sys.version}")
print(f"Working directory: {os.getcwd()}")
print(f"Python path: {sys.path}")

# Test imports
try:
    print("Testing FastAPI import...")
    import fastapi
    print(f"✅ FastAPI {fastapi.__version__} imported successfully")
except Exception as e:
    print(f"❌ FastAPI import failed: {e}")

try:
    print("Testing uvicorn import...")
    import uvicorn
    print(f"✅ Uvicorn imported successfully")
except Exception as e:
    print(f"❌ Uvicorn import failed: {e}")

try:
    print("Testing app.main import...")
    sys.path.insert(0, '.')
    from app.main import app
    print(f"✅ App imported successfully")
except Exception as e:
    print(f"❌ App import failed: {e}")

# List files
print("\n=== Directory Contents ===")
for root, dirs, files in os.walk('.'):
    level = root.replace('.', '').count(os.sep)
    indent = ' ' * 2 * level
    print(f"{indent}{os.path.basename(root)}/")
    subindent = ' ' * 2 * (level + 1)
    for file in files:
        print(f"{subindent}{file}")

print("\n=== Test Complete ===")